import os
from pathlib import Path
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Text Summarization Pipeline"
    APP_BRANDING: str = "Text Summarization Pipeline — Intelligent NLP & MLOps Platform"
    APP_TAGLINE: str = "Intelligent Text Summarization & Continuous MLOps"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # NLP / Model configuration
    MODEL_NAME: str = "google/flan-t5-small"
    MODEL_VERSION: str = "1.0.0"
    DEVICE: str = "cpu"
    MAX_INPUT_LENGTH: int = 2048
    MAX_CHUNK_TOKENS: int = 480
    DEFAULT_MAX_OUTPUT_LENGTH: int = 150
    DEFAULT_MIN_OUTPUT_LENGTH: int = 15
    DEFAULT_NUM_BEAMS: int = 1
    
    # Directories inside backend/
    BACKEND_DIR: Path = BACKEND_DIR
    DATA_DIR: Path = BACKEND_DIR / "data"
    MODELS_DIR: Path = BACKEND_DIR / "models"
    ARTIFACTS_DIR: Path = BACKEND_DIR / "artifacts"
    REPORTS_DIR: Path = BACKEND_DIR / "reports"
    
    # Database persistence
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'data' / 'summarai.db'}"
    
    # MLOps: MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "text-summarization"
    MLFLOW_REGISTERED_MODEL_NAME: str = "text-summarization-model"
    
    # Continuous Learning / Evaluation threshold
    MIN_ROUGE_L_THRESHOLD: float = 0.35
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", str(BACKEND_DIR.parent / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def resolve_paths(self):
        if self.DATABASE_URL.startswith("sqlite:///"):
            raw_path = self.DATABASE_URL[len("sqlite:///"):]
            if raw_path and raw_path != ":memory:":
                p = Path(raw_path)
                if not p.is_absolute():
                    p = (self.BACKEND_DIR / p).resolve()
                    self.DATABASE_URL = f"sqlite:///{p.as_posix()}"
                p.parent.mkdir(parents=True, exist_ok=True)
        return self

settings = Settings()

# Ensure runtime directories exist
for path in [
    settings.DATA_DIR,
    settings.DATA_DIR / "raw",
    settings.DATA_DIR / "processed",
    settings.DATA_DIR / "reference",
    settings.MODELS_DIR,
    settings.ARTIFACTS_DIR,
    settings.REPORTS_DIR,
]:
    path.mkdir(parents=True, exist_ok=True)
