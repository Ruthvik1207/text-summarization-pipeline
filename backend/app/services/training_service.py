import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.db_models import TrainingJob
from app.training.train import run_training_pipeline
from app.utils.logger import logger

class TrainingService:
    def __init__(self):
        self._current_job_id: Optional[str] = None
        self._lock = threading.Lock()

    def start_training_job(
        self,
        model_name: Optional[str] = None,
        epochs: int = 2,
        batch_size: int = 4,
        learning_rate: float = 5e-5,
        dataset_version: str = "v1.0",
        min_rouge_threshold: float = 0.35
    ) -> Dict[str, str]:
        """Initiates a background training job and returns job_id."""
        with self._lock:
            # Generate deterministic job ID with timestamp
            job_id = f"training-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
            target_model = model_name or "google/flan-t5-small"

            # Create DB entry
            db: Session = SessionLocal()
            try:
                job = TrainingJob(
                    job_id=job_id,
                    status="started",
                    progress=0,
                    current_step="Queued for execution",
                    dataset_version=dataset_version,
                    model_name=target_model,
                    candidate_model_name=f"candidate_{job_id}",
                    registered=False
                )
                db.add(job)
                db.commit()
            finally:
                db.close()

            self._current_job_id = job_id

            # Run in daemon thread
            thread = threading.Thread(
                target=self._run_job_worker,
                args=(job_id, target_model, epochs, batch_size, learning_rate, dataset_version, min_rouge_threshold),
                daemon=True
            )
            thread.start()

            return {
                "job_id": job_id,
                "status": "started",
                "message": "Training job dispatched to background worker"
            }

    def _run_job_worker(
        self,
        job_id: str,
        model_name: str,
        epochs: int,
        batch_size: int,
        learning_rate: float,
        dataset_version: str,
        min_rouge_threshold: float
    ):
        logger.info(f"Background training worker started for job {job_id}")

        def progress_callback(pct: int, step: str, metrics: Optional[Dict[str, Any]] = None):
            db: Session = SessionLocal()
            try:
                job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
                if job:
                    job.progress = pct
                    job.current_step = step
                    if pct > 0 and pct < 100:
                        job.status = "running"
                    if metrics:
                        if "rouge1" in metrics:
                            job.rouge1 = metrics["rouge1"]
                        if "rouge2" in metrics:
                            job.rouge2 = metrics["rouge2"]
                        if "rougeL" in metrics:
                            job.rougeL = metrics["rougeL"]
                        if "train_loss" in metrics:
                            job.validation_loss = metrics["train_loss"]
                        if "registered" in metrics:
                            job.registered = metrics["registered"]
                    db.commit()
            except Exception as e:
                logger.error(f"Error updating progress in DB: {e}")
                db.rollback()
            finally:
                db.close()

        db: Session = SessionLocal()
        try:
            # Mark running
            job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
            if job:
                job.status = "running"
                db.commit()
            db.close()

            # Execute pipeline
            result = run_training_pipeline(
                job_id=job_id,
                model_name=model_name,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                dataset_version=dataset_version,
                min_rouge_threshold=min_rouge_threshold,
                progress_callback=progress_callback
            )

            # Mark completed
            db = SessionLocal()
            job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
            if job:
                job.status = "completed"
                job.progress = 100
                job.current_step = "Completed"
                job.rouge1 = result.get("rouge1")
                job.rouge2 = result.get("rouge2")
                job.rougeL = result.get("rougeL")
                job.validation_loss = result.get("train_loss")
                job.registered = result.get("accepted", False)
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
            logger.info(f"Training job {job_id} successfully completed.")
        except Exception as e:
            logger.error(f"Training job {job_id} failed: {e}", exc_info=True)
            db = SessionLocal()
            job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.current_step = f"Failed: {str(e)[:100]}"
                db.commit()
        finally:
            db.close()

    def get_latest_status(self, job_id: Optional[str] = None, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Retrieves status of specific job or latest active job."""
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            if job_id:
                job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
            else:
                job = db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).first()

            if not job:
                return None

            return {
                "job_id": job.job_id,
                "status": job.status,
                "progress": job.progress,
                "current_step": job.current_step,
                "dataset_version": job.dataset_version,
                "model_name": job.model_name,
                "candidate_model_name": job.candidate_model_name,
                "rouge1": job.rouge1,
                "rouge2": job.rouge2,
                "rougeL": job.rougeL,
                "validation_loss": job.validation_loss,
                "registered": job.registered,
                "error_message": job.error_message,
                "created_at": job.created_at.isoformat() if job.created_at else "",
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            }
        finally:
            if close_db:
                db.close()

training_service = TrainingService()
