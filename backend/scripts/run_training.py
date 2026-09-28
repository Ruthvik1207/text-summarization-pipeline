import os
import sys
import json
import yaml
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.training.train import run_training_pipeline
from app.config import settings

def main():
    params_file = Path(__file__).resolve().parent.parent / "params.yaml"
    with open(params_file, "r") as f:
        params = yaml.safe_load(f)["training"]

    print("Running DVC training stage with parameters:", params)
    job_id = f"dvc-run-{int(sys.modules['time'].time())}"

    report = run_training_pipeline(
        job_id=job_id,
        model_name=params.get("model_name", "google/flan-t5-small"),
        epochs=params.get("epochs", 1),
        batch_size=params.get("batch_size", 4),
        learning_rate=float(params.get("learning_rate", 5e-5)),
        dataset_version=params.get("dataset_version", "v1.0"),
        min_rouge_threshold=float(params.get("min_rouge_threshold", 0.35))
    )

    metrics_out = settings.REPORTS_DIR / "train_metrics.json"
    metrics_out.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_out, "w", encoding="utf-8") as f:
        json.dump({
            "rouge1": report.get("rouge1", 0.0),
            "rouge2": report.get("rouge2", 0.0),
            "rougeL": report.get("rougeL", 0.0),
            "train_loss": report.get("train_loss", 0.0),
            "accepted": report.get("accepted", False)
        }, f, indent=2)

    print(f"Training stage complete. Metrics written to {metrics_out}")

if __name__ == "__main__":
    main()
