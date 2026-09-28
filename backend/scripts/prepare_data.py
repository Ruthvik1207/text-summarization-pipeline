import os
import sys
import yaml
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def prepare_data():
    params_file = Path(__file__).resolve().parent.parent / "params.yaml"
    with open(params_file, "r") as f:
        params = yaml.safe_load(f)["prepare"]

    raw_path = Path(__file__).resolve().parent.parent / params["raw_data_path"]
    train_path = Path(__file__).resolve().parent.parent / params["processed_train_path"]
    val_path = Path(__file__).resolve().parent.parent / params["processed_val_path"]

    train_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Reading raw dataset from {raw_path}...")
    df = pd.read_csv(raw_path)
    print(f"Loaded {len(df)} records. Shuffling and splitting with ratio {params['split_ratio']}...")

    df_shuffled = df.sample(frac=1.0, random_state=params.get("random_seed", 42)).reset_index(drop=True)
    split_idx = max(int(len(df_shuffled) * params["split_ratio"]), 1)

    train_df = df_shuffled.iloc[:split_idx]
    val_df = df_shuffled.iloc[split_idx:] if split_idx < len(df_shuffled) else df_shuffled.iloc[:1]

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    print(f"Successfully generated {len(train_df)} train samples -> {train_path}")
    print(f"Successfully generated {len(val_df)} validation samples -> {val_path}")

if __name__ == "__main__":
    prepare_data()
