import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import settings
from app.utils.logger import logger

class EvidentlyMonitor:
    def __init__(self):
        self.reports_dir = settings.REPORTS_DIR
        self.reference_path = settings.DATA_DIR / "reference" / "reference_baseline.csv"
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def load_reference_data(self) -> pd.DataFrame:
        """Loads reference baseline distribution data."""
        if self.reference_path.exists():
            return pd.read_csv(self.reference_path)
        # Fallback default baseline distribution
        return pd.DataFrame({
            "input_length": [820, 1140, 650, 1420, 920, 1050, 780, 1250, 890, 1340],
            "output_length": [95, 110, 80, 135, 102, 118, 88, 122, 98, 128],
            "compression_ratio": [0.115, 0.096, 0.123, 0.095, 0.110, 0.112, 0.112, 0.097, 0.110, 0.095],
            "latency_ms": [1240, 1520, 980, 1890, 1310, 1460, 1120, 1720, 1280, 1780]
        })

    def run_drift_analysis(self, current_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs drift analysis comparing current production distributions against reference baseline.
        Uses Evidently AI report generator where possible, with statistical fallback.
        """
        if current_data.empty:
            return {
                "drift_detected": False,
                "drift_score": 0.0,
                "metrics": {},
                "report_generated": False,
                "report_path": None
            }

        ref_df = self.load_reference_data()
        
        # Ensure common columns
        features = ["input_length", "output_length", "compression_ratio", "latency_ms"]
        for f in features:
            if f not in current_data.columns:
                current_data[f] = 0
            if f not in ref_df.columns:
                ref_df[f] = 0

        curr_subset = current_data[features]
        ref_subset = ref_df[features]

        report_filename = f"monitoring_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.html"
        report_path = self.reports_dir / report_filename
        json_report_path = self.reports_dir / report_filename.replace('.html', '.json')

        drift_detected = False
        p_values = {}
        drift_scores = {}

        # Attempt Evidently AI report generation
        evidently_success = False
        try:
            from evidently.report import Report
            from evidently.metric_preset import DataDriftPreset
            
            report = Report(metrics=[DataDriftPreset()])
            report.run(reference_data=ref_subset, current_data=curr_subset)
            report.save_html(str(report_path))
            
            summary_dict = report.as_dict()
            with open(json_report_path, "w", encoding="utf-8") as jf:
                json.dump(summary_dict, jf, indent=2)
                
            evidently_success = True
            logger.info(f"Evidently AI monitoring report generated: {report_path}")
            
            # Extract drift results
            drift_detected = summary_dict.get("metrics", [{}])[0].get("result", {}).get("dataset_drift", False)
            drift_score = summary_dict.get("metrics", [{}])[0].get("result", {}).get("share_of_drifted_columns", 0.0)
        except Exception as e:
            logger.warning(f"Evidently AI library report encountered fallback trigger ({e}). Using statistical KS-test...")

        if not evidently_success:
            # Statistical drift using Kolmogorov-Smirnov test (scipy)
            from scipy.stats import ks_2samp
            drifted_cols = 0
            for col in features:
                if len(curr_subset[col]) >= 2 and len(ref_subset[col]) >= 2:
                    stat, p_val = ks_2samp(ref_subset[col], curr_subset[col])
                    p_values[col] = round(float(p_val), 4)
                    is_drift = bool(p_val < 0.05)
                    drift_scores[col] = round(float(stat), 4)
                    if is_drift:
                        drifted_cols += 1
                else:
                    p_values[col] = 1.0
                    drift_scores[col] = 0.0

            drift_score = round(drifted_cols / len(features), 3)
            drift_detected = drift_score > 0.5

            # Save clean HTML monitoring report
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>SummarAI Monitoring Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 2rem; }}
        .card {{ background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }}
        h1 {{ color: #06b6d4; font-size: 24px; }}
        h2 {{ color: #a855f7; font-size: 18px; margin-top: 0; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
        th, td {{ padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; }}
        th {{ color: #94a3b8; font-weight: 600; }}
        .badge {{ padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }}
        .pass {{ background: rgba(16, 185, 129, 0.2); color: #34d399; }}
        .drift {{ background: rgba(239, 68, 68, 0.2); color: #f87171; }}
    </style>
</head>
<body>
    <h1>SummarAI Continuous Monitoring Report</h1>
    <p>Generated at: {datetime.now(timezone.utc).isoformat()} UTC</p>
    <div class="card">
        <h2>Overall Status</h2>
        <p>Dataset Drift Detected: <span class="badge {'drift' if drift_detected else 'pass'}">{'DRIFT DETECTED' if drift_detected else 'HEALTHY'}</span></p>
        <p>Overall Drift Score: <strong>{drift_score}</strong></p>
        <p>Total Production Requests Analyzed: <strong>{len(curr_subset)}</strong></p>
    </div>
    <div class="card">
        <h2>Feature-Level Distribution Tests</h2>
        <table>
            <thead>
                <tr>
                    <th>Feature</th>
                    <th>Reference Mean</th>
                    <th>Current Mean</th>
                    <th>KS Statistic</th>
                    <th>P-Value</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {"".join(f"<tr><td>{col}</td><td>{ref_subset[col].mean():.2f}</td><td>{curr_subset[col].mean():.2f}</td><td>{drift_scores.get(col, 0)}</td><td>{p_values.get(col, 1.0)}</td><td><span class='badge {'drift' if p_values.get(col, 1.0) < 0.05 else 'pass'}'>{'DRIFT' if p_values.get(col, 1.0) < 0.05 else 'STABLE'}</span></td></tr>" for col in features)}
            </tbody>
        </table>
    </div>
</body>
</html>"""
            with open(report_path, "w", encoding="utf-8") as hf:
                hf.write(html_content)

        return {
            "drift_detected": drift_detected,
            "drift_score": float(drift_score),
            "report_generated": True,
            "report_path": str(report_path.relative_to(settings.BACKEND_DIR)),
            "feature_drift_scores": drift_scores,
            "total_samples": len(curr_subset)
        }

evidently_monitor = EvidentlyMonitor()
