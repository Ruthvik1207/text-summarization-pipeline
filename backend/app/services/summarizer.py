import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import torch
import mlflow

from app.config import settings
from app.ml.model_loader import model_manager
from app.ml.preprocessor import clean_text, chunk_text
from app.ml.evaluation import compute_summary_stats
from app.ml.message_detector import (
    detect_message_profile,
    demojize_text,
    synthesize_emoji_summary,
    synthesize_short_chat_summary
)
from app.models.db_models import SummaryLog
from app.services.mlflow_service import mlflow_service
from app.utils.logger import logger

class SummarizerService:
    def __init__(self):
        self._mlflow_initialized = False

    def _ensure_mlflow_tracing(self) -> bool:
        """Checks if MLflow tracking server is reachable before initializing traces."""
        if not mlflow_service.is_connected():
            return False
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)
            self._mlflow_initialized = True
            return True
        except Exception as e:
            logger.debug(f"MLflow tracing init note: {e}")
            return False

    def _generate_chunk_summary(
        self,
        chunk: str,
        detected_type: str,
        max_length: int,
        min_length: int,
        temperature: float,
        num_beams: int
    ) -> str:
        """Executes high-performance FLAN-T5 generation for a single text chunk."""
        tokenizer, model = model_manager.load_model()
        device = model_manager.device

        # Demojize emojis so transformer understands their semantics
        demojized_chunk = demojize_text(chunk)
        chunk_words = len(demojized_chunk.split())

        # Select prompt strategy tailored to message type
        if detected_type in ("short_chat", "medium_message"):
            prompt = f"Summarize the key information: {demojized_chunk}"
        else:
            prompt = f"summarize: {demojized_chunk}"

        # Dynamic length constraints to prevent hallucination/padding loops
        eff_min = min(min_length, max(4, int(chunk_words * 0.3)))
        eff_max = min(max_length, max(20, int(chunk_words * 0.9)))
        if eff_min >= eff_max:
            eff_min = max(3, eff_max - 5)

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            max_length=settings.MAX_CHUNK_TOKENS,
            truncation=True,
            padding=False
        ).to(device)

        gen_kwargs: Dict[str, Any] = {
            "max_length": eff_max,
            "min_length": eff_min,
            "num_beams": max(1, num_beams),
            "no_repeat_ngram_size": 3,
            "early_stopping": True
        }

        if temperature > 0.0 and temperature != 1.0 and num_beams == 1:
            gen_kwargs["do_sample"] = True
            gen_kwargs["temperature"] = temperature

        with torch.inference_mode():
            summary_ids = model.generate(inputs["input_ids"], **gen_kwargs)

        res = tokenizer.decode(summary_ids[0], skip_special_tokens=True).strip()
        # Clean potential prompt echoes
        if res.lower().startswith("summarize:") or res.lower().startswith("summary:"):
            res = res.split(":", 1)[1].strip()
        return res

    def _traced_summarize(
        self,
        cleaned_text: str,
        profile: Dict[str, Any],
        title: Optional[str] = None,
        max_length: int = 150,
        min_length: int = 15,
        temperature: float = 0.7,
        num_beams: int = 1
    ) -> Dict[str, Any]:
        """Runs transformer summarization with active MLflow tracing spans."""
        start_time = time.time()
        detected_type = profile["detected_type"]

        with mlflow.start_span(name="clean_and_chunk_text", span_type="PARSER") as p_span:
            p_span.set_inputs({"raw_text_length": len(cleaned_text), "detected_type": detected_type})
            chunks = chunk_text(cleaned_text, max_words_per_chunk=380)
            if len(chunks) > 5:
                # For massive texts, pick representative key sections to maintain fast latency
                chunks = chunks[:2] + [chunks[len(chunks)//2]] + chunks[-2:]
            p_span.set_outputs({"total_chunks": len(chunks), "cleaned_words": len(cleaned_text.split())})

        summaries = []
        for i, chunk in enumerate(chunks):
            span_name = f"flan_t5_chunk_{i+1}_of_{len(chunks)}" if len(chunks) > 1 else "flan_t5_inference"
            with mlflow.start_span(name=span_name, span_type="LLM") as chunk_span:
                chunk_span.set_inputs({"chunk_index": i + 1, "chunk_words": len(chunk.split())})
                chunk_summary = self._generate_chunk_summary(
                    chunk=chunk,
                    detected_type=detected_type,
                    max_length=max_length,
                    min_length=min_length,
                    temperature=temperature,
                    num_beams=num_beams
                )
                if chunk_summary:
                    summaries.append(chunk_summary)
                chunk_span.set_outputs({"chunk_summary": chunk_summary})

        final_summary = " ".join(summaries)

        # Multi-chunk synthesis if multiple chunks
        if len(chunks) > 1 and len(final_summary.split()) > max_length:
            with mlflow.start_span(name="synthesize_summary", span_type="LLM") as synth_span:
                final_summary = self._generate_chunk_summary(
                    chunk=final_summary,
                    detected_type="large_document",
                    max_length=max_length,
                    min_length=min_length,
                    temperature=temperature,
                    num_beams=num_beams
                )
                synth_span.set_outputs({"synthesized_summary": final_summary})

        duration = time.time() - start_time
        stats = compute_summary_stats(cleaned_text, final_summary, duration)

        with mlflow.start_span(name="evaluate_quality_and_metrics", span_type="EVALUATOR") as eval_span:
            eval_span.set_inputs({"duration_sec": round(duration, 4)})
            eval_span.set_outputs(stats)

        try:
            mlflow.set_trace_tag("model_name", model_manager.model_name)
            mlflow.set_trace_tag("detected_type", detected_type)
            mlflow.set_trace_tag("processing_time_ms", str(stats["processing_time_ms"]))
        except Exception:
            pass

        return {"final_summary": final_summary, "cleaned_text": cleaned_text, "stats": stats}

    def _untraced_summarize(
        self,
        cleaned_text: str,
        profile: Dict[str, Any],
        title: Optional[str] = None,
        max_length: int = 150,
        min_length: int = 15,
        temperature: float = 0.7,
        num_beams: int = 1
    ) -> Dict[str, Any]:
        """Blazing fast untraced summarization pipeline."""
        start_time = time.time()
        detected_type = profile["detected_type"]
        chunks = chunk_text(cleaned_text, max_words_per_chunk=380)

        if len(chunks) > 5:
            # Maintain fast sub-2s response for massive documents
            chunks = chunks[:2] + [chunks[len(chunks)//2]] + chunks[-2:]

        summaries = []
        for chunk in chunks:
            chunk_summary = self._generate_chunk_summary(
                chunk=chunk,
                detected_type=detected_type,
                max_length=max_length,
                min_length=min_length,
                temperature=temperature,
                num_beams=num_beams
            )
            if chunk_summary:
                summaries.append(chunk_summary)

        final_summary = " ".join(summaries)
        if len(chunks) > 1 and len(final_summary.split()) > max_length:
            final_summary = self._generate_chunk_summary(
                chunk=final_summary,
                detected_type="large_document",
                max_length=max_length,
                min_length=min_length,
                temperature=temperature,
                num_beams=num_beams
            )

        duration = time.time() - start_time
        stats = compute_summary_stats(cleaned_text, final_summary, duration)
        return {"final_summary": final_summary, "cleaned_text": cleaned_text, "stats": stats}

    def summarize(
        self,
        text: str,
        title: Optional[str] = None,
        max_length: int = 150,
        min_length: Optional[int] = None,
        temperature: float = 0.7,
        num_beams: int = 1,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Universal, high-speed adaptive summarization engine.
        Seamlessly detects and handles all message types:
        - Pure emoji / reactions (< 1ms instant semantic synthesis)
        - Short chat messages / one-liners (< 2ms instant intent takeaway)
        - Medium messages & paragraphs (sub-second FLAN-T5 generation)
        - Long & massive documents (high-speed hierarchical chunking)
        """
        t0 = time.time()
        cleaned_text = clean_text(text)
        if not cleaned_text:
            cleaned_text = text.strip()

        # Step 1: Detect comprehensive message profile & emoji semantics
        profile = detect_message_profile(cleaned_text)
        detected_type = profile["detected_type"]

        effective_min = min_length if min_length is not None else settings.DEFAULT_MIN_OUTPUT_LENGTH
        effective_max = max_length if max_length is not None else settings.DEFAULT_MAX_OUTPUT_LENGTH

        # Tier 1: Pure Emoji messages -> Instant Semantic Synthesis (< 1ms)
        if detected_type == "emoji_only":
            final_summary = synthesize_emoji_summary(profile, cleaned_text)
            duration = max(time.time() - t0, 0.001)
            stats = compute_summary_stats(cleaned_text, final_summary, duration)
            processing_mode = "instant_emoji"

        # Tier 2: Short Chat Messages (<= 15 words or <= 80 chars) -> Instant Intent Gist (< 2ms)
        elif detected_type == "short_chat":
            final_summary = synthesize_short_chat_summary(cleaned_text, profile)
            duration = max(time.time() - t0, 0.001)
            stats = compute_summary_stats(cleaned_text, final_summary, duration)
            processing_mode = "fast_chat_gist"

        # Tier 3 & 4: Medium Messages, Long Documents, and Massive Texts -> Transformer Generation
        else:
            is_mlflow_ready = self._ensure_mlflow_tracing()
            if is_mlflow_ready:
                try:
                    res = self._traced_summarize(
                        cleaned_text=cleaned_text,
                        profile=profile,
                        title=title,
                        max_length=effective_max,
                        min_length=effective_min,
                        temperature=temperature,
                        num_beams=num_beams
                    )
                    try:
                        mlflow.flush_trace_async_logging()
                    except Exception:
                        pass
                except Exception as trace_err:
                    logger.warning(f"Traced summarization failed ({trace_err}), using fast untraced path")
                    res = self._untraced_summarize(
                        cleaned_text=cleaned_text,
                        profile=profile,
                        title=title,
                        max_length=effective_max,
                        min_length=effective_min,
                        temperature=temperature,
                        num_beams=num_beams
                    )
            else:
                res = self._untraced_summarize(
                    cleaned_text=cleaned_text,
                    profile=profile,
                    title=title,
                    max_length=effective_max,
                    min_length=effective_min,
                    temperature=temperature,
                    num_beams=num_beams
                )

            final_summary = res["final_summary"]
            stats = res["stats"]
            processing_mode = "transformer_flan_t5" if detected_type in ("medium_message", "large_document") else "hierarchical_map_reduce"

        now_utc = datetime.now(timezone.utc).isoformat()

        # Step 4: Persist execution log to database
        request_id = None
        if db is not None:
            try:
                log_entry = SummaryLog(
                    title=title,
                    input_text=cleaned_text[:2000],
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
            "title": title,
            "detection": profile,
            "processing_mode": processing_mode
        }

summarizer_service = SummarizerService()
