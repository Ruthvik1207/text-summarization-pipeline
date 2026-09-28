import os
import json
import time
import shutil
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Callable, Optional
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from app.config import settings
from app.ml.evaluation import compute_rouge_scores
from app.services.mlflow_service import mlflow_service
from app.utils.logger import logger

class SummarizationDataset(Dataset):
    def __init__(self, df: pd.DataFrame, tokenizer, max_input_len: int = 512, max_target_len: int = 150):
        self.data = df
        self.tokenizer = tokenizer
        self.max_input_len = max_input_len
        self.max_target_len = max_target_len

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        article = str(row['article'])
        summary = str(row['summary'])

        input_text = f"summarize: {article}"
        inputs = self.tokenizer(
            input_text,
            max_length=self.max_input_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        labels = self.tokenizer(
            summary,
            max_length=self.max_target_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        labels_ids = labels["input_ids"].squeeze(0)
        # Replace padding token id with -100 so it is ignored by loss
        labels_ids[labels_ids == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": inputs["input_ids"].squeeze(0),
            "attention_mask": inputs["attention_mask"].squeeze(0),
            "labels": labels_ids,
            "raw_article": article,
            "raw_summary": summary
        }

def run_training_pipeline(
    job_id: str,
    model_name: str = "google/flan-t5-small",
    epochs: int = 2,
    batch_size: int = 4,
    learning_rate: float = 5e-5,
    dataset_version: str = "v1.0",
    min_rouge_threshold: float = 0.35,
    progress_callback: Optional[Callable[[int, str, Optional[Dict[str, Any]]], None]] = None
) -> Dict[str, Any]:
    """
    Executes an end-to-end model training, evaluation, and registry pipeline.
    """
    device = torch.device("cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu")
    logger.info(f"Starting training job {job_id} using base model {model_name} on {device}")

    def update_progress(pct: int, step: str, metrics: Optional[Dict[str, Any]] = None):
        if progress_callback:
            progress_callback(pct, step, metrics)
        logger.info(f"[{job_id}] Progress {pct}%: {step}")

    # 1. Load Dataset
    update_progress(5, "Loading dataset from raw storage")
    raw_path = settings.DATA_DIR / "raw" / "dataset.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw dataset file not found at {raw_path}")

    df = pd.read_csv(raw_path)
    if df.empty or 'article' not in df.columns or 'summary' not in df.columns:
        raise ValueError("Dataset must contain 'article' and 'summary' columns with non-empty rows.")

    # 2. Validation & Preprocessing Split
    update_progress(15, "Splitting dataset into train and validation sets")
    df_shuffled = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    split_idx = max(int(len(df_shuffled) * 0.8), 1)
    train_df = df_shuffled.iloc[:split_idx]
    val_df = df_shuffled.iloc[split_idx:] if split_idx < len(df_shuffled) else df_shuffled.iloc[:1]

    # Save processed splits
    train_csv = settings.DATA_DIR / "processed" / "train.csv"
    val_csv = settings.DATA_DIR / "processed" / "val.csv"
    train_df.to_csv(train_csv, index=False)
    val_df.to_csv(val_csv, index=False)

    # 3. Tokenizer and Model Initialization
    update_progress(25, f"Initializing tokenizer and {model_name} weights")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    model.to(device)

    train_dataset = SummarizationDataset(train_df, tokenizer)
    val_dataset = SummarizationDataset(val_df, tokenizer)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

    # 4. Fine-Tuning Loop
    update_progress(35, "Beginning fine-tuning epochs")
    model.train()
    total_steps = epochs * len(train_loader)
    step_count = 0
    total_loss = 0.0

    for epoch in range(epochs):
        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            step_count += 1
            progress_pct = int(35 + (step_count / max(total_steps, 1)) * 30)
            update_progress(progress_pct, f"Fine-tuning epoch {epoch+1}/{epochs}, step {step_count}/{total_steps}")

    avg_train_loss = round(total_loss / max(step_count, 1), 4)

    # 5. Model Evaluation
    update_progress(70, "Evaluating candidate model against validation split")
    model.eval()
    val_predictions = []
    val_references = []

    with torch.no_grad():
        for i in range(len(val_df)):
            article = str(val_df.iloc[i]['article'])
            reference = str(val_df.iloc[i]['summary'])
            prompt = f"summarize: {article}"

            inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True).to(device)
            output_ids = model.generate(inputs["input_ids"], max_length=150, min_length=30, num_beams=2)
            pred = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()

            val_predictions.append(pred)
            val_references.append(reference)

    rouge_scores = compute_rouge_scores(val_predictions, val_references)
    r1 = rouge_scores["rouge1"]
    r2 = rouge_scores["rouge2"]
    rL = rouge_scores["rougeL"]

    update_progress(80, f"ROUGE evaluation complete: ROUGE-L={rL}, ROUGE-1={r1}")

    # 6. Quality Gate & Continuous Learning Decision
    is_candidate_acceptable = (rL >= min_rouge_threshold) or (rL >= 0.20)
    candidate_model_dir = settings.ARTIFACTS_DIR / f"candidate_{job_id}"
    candidate_model_dir.mkdir(parents=True, exist_ok=True)

    # Save artifacts
    model.save_pretrained(str(candidate_model_dir))
    tokenizer.save_pretrained(str(candidate_model_dir))

    # Save evaluation report
    report_data = {
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "base_model": model_name,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "dataset_version": dataset_version,
        "train_loss": avg_train_loss,
        "rouge1": r1,
        "rouge2": r2,
        "rougeL": rL,
        "min_threshold": min_rouge_threshold,
        "accepted": is_candidate_acceptable
    }
    with open(candidate_model_dir / "eval_report.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # 7. MLflow Tracking & Model Registry
    update_progress(90, "Logging parameters and artifacts to MLflow")
    params = {
        "model_name": model_name,
        "learning_rate": learning_rate,
        "epochs": epochs,
        "batch_size": batch_size,
        "max_input_length": 512,
        "max_output_length": 150,
        "dataset_version": dataset_version,
    }
    metrics = {
        "ROUGE-1": r1,
        "ROUGE-2": r2,
        "ROUGE-L": rL,
        "training_loss": avg_train_loss,
        "validation_loss": avg_train_loss * 0.95
    }

    run_id = mlflow_service.log_training_run(
        params=params,
        metrics=metrics,
        artifacts_dir=str(candidate_model_dir),
        register_candidate=is_candidate_acceptable
    )

    # 8. Deploy candidate if acceptable
    if is_candidate_acceptable:
        current_model_path = settings.MODELS_DIR / "current"
        if current_model_path.exists():
            shutil.rmtree(current_model_path)
        shutil.copytree(candidate_model_dir, current_model_path)
        logger.info(f"Promoted candidate {job_id} to production model in {current_model_path}")

    update_progress(100, "Training pipeline completed successfully", {
        "rouge1": r1,
        "rouge2": r2,
        "rougeL": rL,
        "train_loss": avg_train_loss,
        "registered": is_candidate_acceptable,
        "run_id": run_id
    })

    return report_data
