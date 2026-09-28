import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class SummaryLog(Base):
    __tablename__ = "summary_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=True)
    input_text = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=False)
    model_name = Column(String(128), nullable=False)
    model_version = Column(String(32), nullable=False)
    input_characters = Column(Integer, nullable=False)
    input_words = Column(Integer, nullable=False)
    summary_words = Column(Integer, nullable=False)
    compression_ratio = Column(Float, nullable=False)
    processing_time_ms = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=utcnow, index=True)

class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    summary_id = Column(String(36), nullable=True, index=True)
    is_useful = Column(Boolean, nullable=False)
    reference_summary = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utcnow)

class TrainingJob(Base):
    __tablename__ = "training_jobs"

    job_id = Column(String(64), primary_key=True)
    status = Column(String(32), default="started", index=True)  # queued, started, running, completed, failed
    progress = Column(Integer, default=0)
    current_step = Column(String(128), default="Initializing")
    dataset_version = Column(String(32), default="v1.0")
    model_name = Column(String(128), nullable=False)
    candidate_model_name = Column(String(128), nullable=True)
    rouge1 = Column(Float, nullable=True)
    rouge2 = Column(Float, nullable=True)
    rougeL = Column(Float, nullable=True)
    validation_loss = Column(Float, nullable=True)
    registered = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

class MonitoringLog(Base):
    __tablename__ = "monitoring_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=utcnow, index=True)
    input_length = Column(Integer, nullable=False)
    output_length = Column(Integer, nullable=False)
    compression_ratio = Column(Float, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    drift_score = Column(Float, default=0.0)
