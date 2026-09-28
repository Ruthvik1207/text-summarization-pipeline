from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.db_models import SummaryLog

class AnalyticsService:
    def get_analytics(self, db: Session) -> Dict[str, Any]:
        """Calculates real analytical distributions and aggregates from SQLite."""
        logs = db.query(SummaryLog).order_by(SummaryLog.timestamp.asc()).all()
        total = len(logs)

        if total == 0:
            return {
                "total_summaries": 0,
                "avg_processing_time": 0.0,
                "avg_compression_ratio": 0.0,
                "avg_input_length": 0.0,
                "avg_summary_length": 0.0,
                "volume_by_date": [],
                "length_distribution": [],
                "compression_distribution": []
            }

        avg_time = round(sum(l.processing_time_ms for l in logs) / total, 1)
        avg_comp = round(sum(l.compression_ratio for l in logs) / total, 4)
        avg_in_len = round(sum(l.input_words for l in logs) / total, 1)
        avg_out_len = round(sum(l.summary_words for l in logs) / total, 1)

        # Volume by date
        by_date = defaultdict(int)
        for l in logs:
            if l.timestamp:
                d_str = l.timestamp.strftime("%Y-%m-%d")
                by_date[d_str] += 1
        volume_by_date = [{"date": k, "count": v} for k, v in sorted(by_date.items())]

        # Length distribution buckets
        buckets = {"< 100": 0, "100-250": 0, "250-500": 0, "500-1000": 0, "> 1000": 0}
        for l in logs:
            w = l.input_words
            if w < 100:
                buckets["< 100"] += 1
            elif w <= 250:
                buckets["100-250"] += 1
            elif w <= 500:
                buckets["250-500"] += 1
            elif w <= 1000:
                buckets["500-1000"] += 1
            else:
                buckets["> 1000"] += 1
        length_distribution = [{"range": k, "count": v} for k, v in buckets.items()]

        # Compression ratio distribution buckets
        comp_buckets = {"< 10%": 0, "10-20%": 0, "20-30%": 0, "30-50%": 0, "> 50%": 0}
        for l in logs:
            r = l.compression_ratio
            if r < 0.10:
                comp_buckets["< 10%"] += 1
            elif r <= 0.20:
                comp_buckets["10-20%"] += 1
            elif r <= 0.30:
                comp_buckets["20-30%"] += 1
            elif r <= 0.50:
                comp_buckets["30-50%"] += 1
            else:
                comp_buckets["> 50%"] += 1
        compression_distribution = [{"bucket": k, "count": v} for k, v in comp_buckets.items()]

        return {
            "total_summaries": total,
            "avg_processing_time": avg_time,
            "avg_compression_ratio": avg_comp,
            "avg_input_length": avg_in_len,
            "avg_summary_length": avg_out_len,
            "volume_by_date": volume_by_date,
            "length_distribution": length_distribution,
            "compression_distribution": compression_distribution
        }

analytics_service = AnalyticsService()
