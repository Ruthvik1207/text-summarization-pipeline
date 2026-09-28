import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import torch

from app.config import settings
from app.ml.model_loader import model_manager
from app.ml.preprocessor import clean_text, chunk_text
from app.ml.evaluation import compute_summary_stats
from app.models.db_models import SummaryLog
from app.utils.logger import logger

class SummarizerService:
    def summarize(
        self,
        text: str,
        title: Optional[str] = None,
        max_length: int = 150,
        min_length: int = 40,
        temperature: float = 0.7,
        num_beams: int = 2,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Executes real abstractive text summarization using T5 / FLAN-T5.
        Handles long documents through intelligent chunking so the model never crashes.
        """
        start_time = time.time()
        
        # 1. Clean input text
        cleaned_text = clean_text(text)
        
        # 2. Get tokenizer and model singleton
        tokenizer, model = model_manager.load_model()
        device = model_manager.device

        # 3. Chunk text if necessary
        chunks = chunk_text(cleaned_text, max_words_per_chunk=320)
        logger.info(f"Summarizing text with {len(cleaned_text.split())} words split into {len(chunks)} chunk(s)")

        summaries = []
        for i, chunk in enumerate(chunks):
            # T5 prompt prefix
            prompt = f"summarize: {chunk}"
            
            inputs = tokenizer(
                prompt,
                return_tensors="pt",
                max_length=settings.MAX_CHUNK_TOKENS,
                truncation=True,
                padding=False
            ).to(device)

            gen_kwargs = {
                "max_length": max_length,
                "min_length": min(min_length, max_length - 5),
                "num_beams": num_beams,
                "no_repeat_ngram_size": 3,
                "early_stopping": True
            }

            if temperature > 0.0 and temperature != 1.0 and num_beams == 1:
                gen_kwargs["do_sample"] = True
                gen_kwargs["temperature"] = temperature

            with torch.no_grad():
                summary_ids = model.generate(inputs["input_ids"], **gen_kwargs)

            chunk_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True).strip()
            if chunk_summary:
                summaries.append(chunk_summary)

        # Combine chunk summaries
        final_summary = " ".join(summaries)
        
        # If multiple chunks were summarized and result is still long, synthesize if needed
        if len(chunks) > 2 and len(final_summary.split()) > max_length:
            logger.info("Synthesizing multi-chunk summaries into concise final summary...")
            prompt = f"summarize: {final_summary}"
            inputs = tokenizer(prompt, return_tensors="pt", max_length=settings.MAX_CHUNK_TOKENS, truncation=True).to(device)
            with torch.no_grad():
                summary_ids = model.generate(
                    inputs["input_ids"],
                    max_length=max_length,
                    min_length=min_length,
                    num_beams=num_beams,
                    early_stopping=True
                )
            final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True).strip()

        duration = time.time() - start_time

        # 4. Compute real statistics
        stats = compute_summary_stats(cleaned_text, final_summary, duration)
        now_utc = datetime.now(timezone.utc).isoformat()

        # 5. Persist to database
        request_id = None
        if db is not None:
            try:
                log_entry = SummaryLog(
                    title=title,
                    input_text=cleaned_text[:2000],  # store preview / first 2000 chars for privacy & storage
                    summary_text=final_summary,
                    model_name=model_manager.model_name,
                    model_version=model_manager.model_version,
                    input_characters=stats["input_characters"],
                    input_words=stats["input_words"],
                    summary_words=stats["summary_words"],
                    compression_ratio=stats["compression_ratio"],
                    processing_time_ms=stats["processing_time_ms"]
                )
                db.add(log_entry)
                db.commit()
                db.refresh(log_entry)
                request_id = log_entry.id
            except Exception as e:
                logger.error(f"Failed to log summary into database: {e}")
                db.rollback()

        return {
            "summary": final_summary,
            "model_name": model_manager.model_name,
            "model_version": model_manager.model_version,
            "input_characters": stats["input_characters"],
            "input_words": stats["input_words"],
            "summary_words": stats["summary_words"],
            "compression_ratio": stats["compression_ratio"],
            "processing_time_ms": stats["processing_time_ms"],
            "timestamp": now_utc,
            "request_id": request_id,
            "title": title
        }

summarizer_service = SummarizerService()
