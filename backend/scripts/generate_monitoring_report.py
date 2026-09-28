import os
import sys
import yaml
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.monitoring.evidently_monitor import evidently_monitor
from app.config import settings

def main():
    params_file = Path(__file__).resolve().parent.parent / "params.yaml"
    with open(params_file, "r") as f:
        params = yaml.safe_load(f)["monitoring"]

    ref_path = Path(__file__).resolve().parent.parent / params["reference_data_path"]
    ref_df = pd.read_csv(ref_path)

    # Simulate recent inference records
    sample_prod = ref_df.sample(n=min(len(ref_df), 10), replace=True).copy()
    sample_prod["latency_ms"] = sample_prod["latency_ms"] * 1.05

    print(f"Generating Evidently monitoring drift analysis with {len(sample_prod)} records...")
    res = evidently_monitor.run_drift_analysis(sample_prod)
    print("Monitoring report generation complete:")
    print(f"  Drift detected: {res['drift_detected']}")
    print(f"  Drift score: {res['drift_score']}")
    print(f"  Report saved to: {res['report_path']}")

if __name__ == "__main__":
    main()
