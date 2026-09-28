from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

class SummarizeRequest(BaseModel):
    text: str = Field(..., description="The document, article, or text to summarize")
    title: Optional[str] = Field(None, description="Optional document title")
    max_length: Optional[int] = Field(150, ge=20, le=512, description="Maximum output summary tokens")
    min_length: Optional[int] = Field(40, ge=10, le=400, description="Minimum output summary tokens")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Generation temperature")
    num_beams: Optional[int] = Field(2, ge=1, le=8, description="Number of beams for beam search")

    @model_validator(mode="after")
    def validate_lengths(self) -> 'SummarizeRequest':
        cleaned = self.text.strip()
        if not cleaned:
            raise ValueError("Input text cannot be empty or only whitespace")
        if len(cleaned) < 25:
            raise ValueError("Input text is too short to summarize (minimum 25 characters required)")
        if len(cleaned) > 30000:
            raise ValueError("Input text exceeds the maximum allowed length of 30,000 characters")
        if self.min_length is not None and self.max_length is not None:
            if self.min_length > self.max_length:
                raise ValueError(f"min_length ({self.min_length}) cannot be greater than max_length ({self.max_length})")
        return self

class SummarizeResponse(BaseModel):
    summary: str
    model_name: str
    model_version: str
    input_characters: int
    input_words: int
    summary_words: int
    compression_ratio: float
    processing_time_ms: int
    timestamp: str
    request_id: Optional[str] = None
    title: Optional[str] = None

class FeedbackRequest(BaseModel):
    summary_id: Optional[str] = Field(None, description="ID of the summary being reviewed")
    is_useful: bool = Field(..., description="Whether the summary was helpful")
    reference_summary: Optional[str] = Field(None, description="Corrected or reference summary for training")
    rating: Optional[int] = Field(None, ge=1, le=5, description="1 to 5 star rating")
    comment: Optional[str] = Field(None, max_length=1000, description="User comments or notes")

class FeedbackResponse(BaseModel):
    status: str = "success"
    feedback_id: str
    message: str

class TrainRequest(BaseModel):
    model_name: Optional[str] = Field(None, description="Base model name (e.g. google/flan-t5-small)")
    epochs: Optional[int] = Field(2, ge=1, le=10, description="Training epochs")
    batch_size: Optional[int] = Field(4, ge=1, le=32, description="Batch size")
    learning_rate: Optional[float] = Field(5e-5, ge=1e-6, le=1e-2, description="Learning rate")
    dataset_version: Optional[str] = Field("v1.0", description="Dataset version identifier")
    min_rouge_threshold: Optional[float] = Field(0.35, ge=0.1, le=1.0, description="Threshold for candidate acceptance")

class TrainResponse(BaseModel):
    job_id: str
    status: str
    message: str

class TrainingStatusResponse(BaseModel):
    job_id: str
    status: str  # started, running, completed, failed
    progress: int
    current_step: str
    dataset_version: str
    model_name: str
    candidate_model_name: Optional[str] = None
    rouge1: Optional[float] = None
    rouge2: Optional[float] = None
    rougeL: Optional[float] = None
    validation_loss: Optional[float] = None
    registered: bool = False
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    device: str
    mlflow_connected: bool
    timestamp: str

class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    parameters_count: str
    device: str
    max_context_length: int
    supported_languages: List[str]
    is_loaded: bool
    status: str

class DatasetInfoResponse(BaseModel):
    version: str
    num_records: int
    size_bytes: int
    last_updated: str
    dvc_tracked: bool
    splits: Dict[str, int]
    features: List[str]
    sample_records: List[Dict[str, Any]]

class MLflowStatusResponse(BaseModel):
    tracking_uri: str
    is_connected: bool
    experiment_name: str
    latest_run_id: Optional[str] = None
    latest_metrics: Dict[str, float] = {}
    registered_model_name: str
    registered_model_version: Optional[str] = None
    runs_count: int = 0

class MonitoringResponse(BaseModel):
    total_predictions: int
    avg_compression_ratio: float
    avg_processing_time_ms: float
    avg_input_words: float
    avg_summary_words: float
    drift_detected: bool
    drift_score: float
    report_generated: bool
    report_path: Optional[str] = None
    recent_metrics: List[Dict[str, Any]] = []

class AnalyticsSummaryResponse(BaseModel):
    total_summaries: int
    avg_processing_time: float
    avg_compression_ratio: float
    avg_input_length: float
    avg_summary_length: float
    volume_by_date: List[Dict[str, Any]]
    length_distribution: List[Dict[str, Any]]
    compression_distribution: List[Dict[str, Any]]

class BatchSummarizeItem(BaseModel):
    id: Optional[str] = None
    text: str
    title: Optional[str] = None
    reference_summary: Optional[str] = None

class BatchSummarizeRequest(BaseModel):
    items: List[BatchSummarizeItem] = Field(..., max_length=100)
    max_length: Optional[int] = Field(150, ge=20, le=512)
    min_length: Optional[int] = Field(40, ge=10, le=400)
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    num_beams: Optional[int] = Field(2, ge=1, le=8)

class BatchItemResult(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    original_text: str
    input_words: int
    input_characters: int
    summary: str
    summary_words: int
    compression_ratio: float
    processing_time_ms: int
    rouge1: Optional[float] = None
    rouge2: Optional[float] = None
    rougeL: Optional[float] = None
    status: str = "success"
    error: Optional[str] = None

class BatchSummarizeResponse(BaseModel):
    total_processed: int
    successful: int
    failed: int
    avg_processing_time_ms: float
    results: List[BatchItemResult]
