import os
import threading
from typing import Optional, Tuple
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, PreTrainedModel, PreTrainedTokenizer
from app.config import settings
from app.utils.logger import logger

class ModelManager:
    _instance: Optional['ModelManager'] = None
    _lock = threading.Lock()

    def __init__(self):
        self.model_name = settings.MODEL_NAME
        self.model_version = settings.MODEL_VERSION
        self.device = torch.device("cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu")
        self.tokenizer: Optional[PreTrainedTokenizer] = None
        self.model: Optional[PreTrainedModel] = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> 'ModelManager':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def load_model(self) -> Tuple[PreTrainedTokenizer, PreTrainedModel]:
        """Loads model and tokenizer once into memory, caching them as a singleton."""
        if self.is_loaded and self.tokenizer is not None and self.model is not None:
            return self.tokenizer, self.model

        with self._lock:
            if self.is_loaded and self.tokenizer is not None and self.model is not None:
                return self.tokenizer, self.model

            try:
                logger.info(f"Loading transformer model and tokenizer: {self.model_name} on {self.device}...")
                
                # Check if local model checkpoint exists in models directory
                local_model_path = settings.MODELS_DIR / "current"
                source = str(local_model_path) if local_model_path.exists() and (local_model_path / "config.json").exists() else self.model_name
                
                logger.info(f"Loading weights from: {source}")
                self.tokenizer = AutoTokenizer.from_pretrained(source)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(source)
                
                self.model.to(self.device)
                self.model.eval()
                self.is_loaded = True
                self.load_error = None
                logger.info(f"Model successfully loaded: {self.model_name} ({self.get_parameters_count()}) on {self.device}")
                return self.tokenizer, self.model
            except Exception as e:
                self.load_error = str(e)
                logger.error(f"Error loading model {self.model_name}: {e}", exc_info=True)
                raise RuntimeError(f"Failed to load summarization model '{self.model_name}': {e}") from e

    def get_parameters_count(self) -> str:
        if self.model is None:
            return "Unknown"
        total_params = sum(p.numel() for p in self.model.parameters())
        if total_params >= 1e9:
            return f"{total_params / 1e9:.2f}B"
        elif total_params >= 1e6:
            return f"{total_params / 1e6:.1f}M"
        return f"{total_params:,}"

    def get_info(self) -> dict:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "architecture": "Seq2SeqLM (T5 / FLAN-T5)",
            "parameters_count": self.get_parameters_count() if self.is_loaded else "60M (flan-t5-small)",
            "device": str(self.device),
            "max_context_length": settings.MAX_INPUT_LENGTH,
            "supported_languages": ["English", "Multi-lingual capable"],
            "is_loaded": self.is_loaded,
            "status": "Ready" if self.is_loaded else ("Failed" if self.load_error else "Unloaded")
        }

model_manager = ModelManager.get_instance()
