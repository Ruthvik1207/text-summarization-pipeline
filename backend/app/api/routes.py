from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.ml.model_loader import model_manager
from app.models.db_models import FeedbackLog, SummaryLog
from app.schemas.summarization import (
    SummarizeRequest,
    SummarizeResponse,
    BatchSummarizeRequest,
    BatchSummarizeResponse,
    BatchItemResult,
    FeedbackRequest,
    FeedbackResponse,
    TrainRequest,
    TrainResponse,
    TrainingStatusResponse,
    HealthResponse,
    ModelInfoResponse,
    DatasetInfoResponse,
    MLflowStatusResponse,
    MonitoringResponse,
    AnalyticsSummaryResponse,
)
from app.ml.evaluation import compute_rouge_scores
from app.services.summarizer import summarizer_service
from app.services.mlflow_service import mlflow_service
from app.services.monitoring_service import monitoring_service
from app.services.dataset_service import dataset_service
from app.services.training_service import training_service
from app.services.analytics_service import analytics_service
from app.utils.logger import logger

router = APIRouter(prefix=settings.API_V1_STR)

@router.get("/health", response_model=HealthResponse, summary="API Health Check")
def get_health():
    """Returns the operational status of the API, loaded transformer model, and MLflow connectivity."""
    return HealthResponse(
        status="healthy",
        model_loaded=model_manager.is_loaded,
        model_name=model_manager.model_name,
        device=str(model_manager.device),
        mlflow_connected=mlflow_service.is_connected(),
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@router.post("/summarize", response_model=SummarizeResponse, summary="Generate Document Summary")
def summarize_text(payload: SummarizeRequest, db: Session = Depends(get_db)):
    """
    Accepts raw text or document, performs input validation, executes T5/FLAN-T5 abstractive
    summarization, logs execution metrics, and returns the generated summary with statistics.
    """
    try:
        result = summarizer_service.summarize(
            text=payload.text,
            title=payload.title,
            max_length=payload.max_length or settings.DEFAULT_MAX_OUTPUT_LENGTH,
            min_length=payload.min_length or settings.DEFAULT_MIN_OUTPUT_LENGTH,
            temperature=payload.temperature if payload.temperature is not None else 0.7,
            num_beams=payload.num_beams or 2,
            db=db
        )
        return SummarizeResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Summarization request failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization processing error: {str(e)}"
        )

@router.post("/summarize/batch", response_model=BatchSummarizeResponse, summary="Batch Summarize Multiple Texts / CSV Rows")
def summarize_batch(payload: BatchSummarizeRequest, db: Session = Depends(get_db)):
    """
    Accepts a batch of texts/rows (e.g. from an uploaded CSV file), runs abstractive summarization,
    computes compression statistics, and calculates ROUGE metrics if reference summaries are provided.
    """
    results = []
    total_time = 0.0

    for item in payload.items:
        cleaned_text = item.text.strip()
        if not cleaned_text:
            results.append(BatchItemResult(
                id=item.id,
                title=item.title,
                original_text="",
                input_words=0,
                input_characters=0,
                summary="",
                summary_words=0,
                compression_ratio=0.0,
                processing_time_ms=0,
                status="skipped",
                error="Empty text"
            ))
            continue

        try:
            res = summarizer_service.summarize(
                text=cleaned_text,
                title=item.title,
                max_length=payload.max_length or settings.DEFAULT_MAX_OUTPUT_LENGTH,
                min_length=payload.min_length or settings.DEFAULT_MIN_OUTPUT_LENGTH,
                temperature=payload.temperature if payload.temperature is not None else 0.7,
                num_beams=payload.num_beams or 2,
                db=db
            )
            total_time += res["processing_time_ms"]

            r1, r2, rL = None, None, None
            if item.reference_summary and item.reference_summary.strip():
                try:
                    scores = compute_rouge_scores([res["summary"]], [item.reference_summary.strip()])
                    r1 = scores["rouge1"]
                    r2 = scores["rouge2"]
                    rL = scores["rougeL"]
                except Exception as eval_err:
                    logger.warning(f"Could not compute ROUGE for item {item.id}: {eval_err}")

            results.append(BatchItemResult(
                id=item.id,
                title=item.title,
                original_text=cleaned_text,
                input_words=res["input_words"],
                input_characters=res["input_characters"],
                summary=res["summary"],
                summary_words=res["summary_words"],
                compression_ratio=res["compression_ratio"],
                processing_time_ms=res["processing_time_ms"],
                rouge1=r1,
                rouge2=r2,
                rougeL=rL,
                status="success"
            ))
        except Exception as e:
            logger.error(f"Error in batch item {item.id}: {e}")
            results.append(BatchItemResult(
                id=item.id,
                title=item.title,
                original_text=cleaned_text,
                input_words=len(cleaned_text.split()),
                input_characters=len(cleaned_text),
                summary="",
                summary_words=0,
                compression_ratio=0.0,
                processing_time_ms=0,
                status="failed",
                error=str(e)
            ))

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful
    avg_time = round(total_time / max(successful, 1), 2)

    return BatchSummarizeResponse(
        total_processed=len(results),
        successful=successful,
        failed=failed,
        avg_processing_time_ms=avg_time,
        results=results
    )

@router.get("/model", response_model=ModelInfoResponse, summary="Model Metadata & Details")
def get_model_info():
    """Returns architecture, parameter count, device placement, and version of current NLP model."""
    info = model_manager.get_info()
    return ModelInfoResponse(**info)

@router.get("/metrics", response_model=AnalyticsSummaryResponse, summary="Summary Aggregate Metrics")
def get_metrics(db: Session = Depends(get_db)):
    """Computes real historical analytics, distributions, and average processing metrics."""
    data = analytics_service.get_analytics(db)
    return AnalyticsSummaryResponse(**data)

@router.get("/monitoring", response_model=MonitoringResponse, summary="Evidently AI Continuous Monitoring")
def get_monitoring(db: Session = Depends(get_db)):
    """Evaluates data drift, compression trends, and latency using Evidently AI reports."""
    data = monitoring_service.get_monitoring_data(db)
    return MonitoringResponse(**data)

@router.get("/mlflow", response_model=MLflowStatusResponse, summary="MLflow Tracking Status")
def get_mlflow_status():
    """Fetches connection status, experiment metrics, and Model Registry details from MLflow."""
    data = mlflow_service.get_status()
    return MLflowStatusResponse(**data)

@router.get("/dataset", response_model=DatasetInfoResponse, summary="Dataset & DVC Metadata")
def get_dataset_info():
    """Returns dataset size, splits, feature schema, and DVC tracking status."""
    data = dataset_service.get_info()
    return DatasetInfoResponse(**data)

@router.post("/feedback", response_model=FeedbackResponse, summary="Submit User Feedback")
def submit_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    """Stores user evaluation of summary quality to support future continuous learning."""
    try:
        feedback = FeedbackLog(
            summary_id=payload.summary_id,
            is_useful=payload.is_useful,
            reference_summary=payload.reference_summary,
            rating=payload.rating,
            comment=payload.comment
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return FeedbackResponse(
            status="success",
            feedback_id=feedback.id,
            message="Feedback recorded for continuous model improvement."
        )
    except Exception as e:
        logger.error(f"Error saving feedback: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record user feedback."
        )

@router.post("/train", response_model=TrainResponse, summary="Trigger Continuous Retraining")
def trigger_training(payload: Optional[TrainRequest] = None):
    """
    Triggers a background fine-tuning pipeline with ROUGE evaluation, quality thresholding,
    and automatic candidate registration in MLflow.
    """
    try:
        req = payload or TrainRequest()
        result = training_service.start_training_job(
            model_name=req.model_name,
            epochs=req.epochs or 2,
            batch_size=req.batch_size or 4,
            learning_rate=req.learning_rate or 5e-5,
            dataset_version=req.dataset_version or "v1.0",
            min_rouge_threshold=req.min_rouge_threshold or settings.MIN_ROUGE_L_THRESHOLD
        )
        return TrainResponse(**result)
    except Exception as e:
        logger.error(f"Failed to start training job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initialize training job: {str(e)}"
        )

@router.get("/training/status", response_model=TrainingStatusResponse, summary="Training Job Status")
def get_training_status(job_id: Optional[str] = Query(None, description="Optional job ID to inspect"), db: Session = Depends(get_db)):
    """Polls real-time progress, steps, and ROUGE metrics of running or latest background training jobs."""
    status_info = training_service.get_latest_status(job_id=job_id, db=db)
    if not status_info:
        if job_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job '{job_id}' not found."
            )
        # Return default idle state if no jobs have run yet
        return TrainingStatusResponse(
            job_id="idle",
            status="completed",
            progress=0,
            current_step="System ready for fine-tuning",
            dataset_version="v1.0",
            model_name=model_manager.model_name,
            candidate_model_name=None,
            rouge1=None,
            rouge2=None,
            rougeL=None,
            validation_loss=None,
            registered=False,
            created_at=datetime.now(timezone.utc).isoformat(),
            completed_at=None
        )
    return TrainingStatusResponse(**status_info)
