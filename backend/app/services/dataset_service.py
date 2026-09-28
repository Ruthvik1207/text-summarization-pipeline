import os
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List
from app.config import settings
from app.utils.logger import logger

class DatasetService:
    def __init__(self):
        self.raw_path = settings.DATA_DIR / "raw" / "dataset.csv"
        self.processed_dir = settings.DATA_DIR / "processed"
        self.train_path = self.processed_dir / "train.csv"
        self.val_path = self.processed_dir / "val.csv"
        self.dvc_file = settings.BACKEND_DIR / "dvc.yaml"

    def get_info(self) -> Dict[str, Any]:
        """Returns metadata about the active datasets and DVC status."""
        num_records = 0
        size_bytes = 0
        last_updated = datetime.now(timezone.utc).isoformat()
        samples: List[Dict[str, Any]] = []

        if self.raw_path.exists():
            size_bytes = self.raw_path.stat().st_size
            last_updated = datetime.fromtimestamp(self.raw_path.stat().st_mtime, timezone.utc).isoformat()
            try:
                with open(self.raw_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    num_records = len(rows)
                    samples = [
                        {str(k): (str(v) if v is not None else "") for k, v in row.items() if k is not None}
                        for row in rows[:3]
                    ]
            except Exception as e:
                logger.error(f"Error reading raw dataset: {e}")

        # Check splits
        splits = {"raw": num_records, "train": 0, "val": 0}
        if self.train_path.exists():
            try:
                with open(self.train_path, mode="r", encoding="utf-8") as f:
                    splits["train"] = sum(1 for _ in f) - 1
            except Exception:
                pass
        else:
            splits["train"] = int(num_records * 0.8)

        if self.val_path.exists():
            try:
                with open(self.val_path, mode="r", encoding="utf-8") as f:
                    splits["val"] = sum(1 for _ in f) - 1
            except Exception:
                pass
        else:
            splits["val"] = max(num_records - splits["train"], 0)

        dvc_tracked = self.dvc_file.exists() or (settings.BACKEND_DIR / ".dvc").exists()

        return {
            "version": "v1.0-sample",
            "num_records": num_records,
            "size_bytes": size_bytes,
            "last_updated": last_updated,
            "dvc_tracked": dvc_tracked,
            "splits": splits,
            "features": ["id", "title", "article", "summary"],
            "sample_records": samples
        }

dataset_service = DatasetService()
