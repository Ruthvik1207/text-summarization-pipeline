import pandas as pd
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.db_models import SummaryLog
from app.monitoring.evidently_monitor import evidently_monitor
from app.utils.logger import logger

class MonitoringService:
    def get_monitoring_data(self, db: Session) -> Dict[str, Any]:
        """Calculates real production monitoring statistics and runs drift analysis."""
        logs = db.query(SummaryLog).order_by(SummaryLog.timestamp.desc()).limit(100).all()
        
        total = db.query(SummaryLog).count()
        if total == 0:
            return {
                "total_predictions": 0,
                "avg_compression_ratio": 0.0,
                "avg_processing_time_ms": 0.0,
                "avg_input_words": 0.0,
                "avg_summary_words": 0.0,
                "drift_detected": False,
                "drift_score": 0.0,
                "report_generated": False,
                "report_path": None,
                "recent_metrics": []
            }

        df = pd.DataFrame([{
            "input_length": l.input_words,
            "output_length": l.summary_words,
            "compression_ratio": l.compression_ratio,
            "latency_ms": l.processing_time_ms,
            "timestamp": l.timestamp.isoformat() if l.timestamp else ""
        } for l in logs])

        avg_comp = round(float(df["compression_ratio"].mean()), 4) if not df.empty else 0.0
        avg_time = round(float(df["latency_ms"].mean()), 1) if not df.empty else 0.0
        avg_in_words = round(float(df["input_length"].mean()), 1) if not df.empty else 0.0
        avg_out_words = round(float(df["output_length"].mean()), 1) if not df.empty else 0.0

        # Run drift analysis if we have at least 3 records
        drift_results = {"drift_detected": False, "drift_score": 0.0, "report_generated": False, "report_path": None}
        if len(df) >= 3:
            try:
                drift_results = evidently_monitor.run_drift_analysis(df)
            except Exception as e:
                logger.error(f"Error computing drift: {e}")

        # Recent 10 metrics for table
        recent = df.head(10).to_dict(orient="records")

        return {
            "total_predictions": total,
            "avg_compression_ratio": avg_comp,
            "avg_processing_time_ms": avg_time,
            "avg_input_words": avg_in_words,
            "avg_summary_words": avg_out_words,
            "drift_detected": drift_results.get("drift_detected", False),
            "drift_score": drift_results.get("drift_score", 0.0),
            "report_generated": drift_results.get("report_generated", False),
            "report_path": drift_results.get("report_path"),
            "recent_metrics": recent
        }

monitoring_service = MonitoringService()
