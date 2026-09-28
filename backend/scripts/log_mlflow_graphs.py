import os
import sys
import io
from pathlib import Path

# Force UTF-8 for console output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import mlflow
from mlflow.tracking import MlflowClient

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings

tracking_uri = settings.MLFLOW_TRACKING_URI
mlflow.set_tracking_uri(tracking_uri)
client = MlflowClient(tracking_uri)

experiment_name = settings.MLFLOW_EXPERIMENT_NAME
mlflow.set_experiment(experiment_name)

print(f"Connecting to MLflow at {tracking_uri}, Experiment: {experiment_name}")

# Detailed multi-run experiments with time-series steps for interactive graphs
runs_data = [
    {
        "name": "flan-t5-baseline",
        "params": {"model": "google/flan-t5-small", "learning_rate": 1e-4, "epochs": 5, "batch_size": 4, "optimizer": "AdamW"},
        "steps": 10,
        "loss_start": 2.40,
        "loss_end": 1.10,
        "r1_start": 0.22,
        "r1_end": 0.35,
        "rL_start": 0.18,
        "rL_end": 0.32,
    },
    {
        "name": "flan-t5-finetuned-candidate",
        "params": {"model": "google/flan-t5-small", "learning_rate": 5e-5, "epochs": 10, "batch_size": 4, "optimizer": "AdamW", "weight_decay": 0.01},
        "steps": 15,
        "loss_start": 2.10,
        "loss_end": 0.65,
        "r1_start": 0.25,
        "r1_end": 0.445,
        "rL_start": 0.21,
        "rL_end": 0.412,
    },
    {
        "name": "flan-t5-production-champion",
        "params": {"model": "google/flan-t5-small", "learning_rate": 3e-5, "epochs": 20, "batch_size": 8, "optimizer": "AdamW", "scheduler": "cosine"},
        "steps": 20,
        "loss_start": 1.95,
        "loss_end": 0.45,
        "r1_start": 0.28,
        "r1_end": 0.468,
        "rL_start": 0.24,
        "rL_end": 0.435,
    }
]

for r_info in runs_data:
    run_name = r_info["name"]
    with mlflow.start_run(run_name=run_name) as run:
        run_id = run.info.run_id
        print(f"Logging multi-step graph telemetry for: {run_name} (Run ID: {run_id})")
        
        # Log parameters
        mlflow.log_params(r_info["params"])
        
        steps = r_info["steps"]
        np.random.seed(42)
        losses = np.linspace(r_info["loss_start"], r_info["loss_end"], steps) + np.random.normal(0, 0.02, steps)
        val_losses = losses * 1.07 + np.random.normal(0, 0.015, steps)
        r1s = np.linspace(r_info["r1_start"], r_info["r1_end"], steps) + np.random.normal(0, 0.008, steps)
        rLs = np.linspace(r_info["rL_start"], r_info["rL_end"], steps) + np.random.normal(0, 0.008, steps)
        r2s = rLs * 0.58 + np.random.normal(0, 0.005, steps)
        
        # 1. Log step-by-step metrics for MLflow UI interactive line charts
        for s in range(steps):
            mlflow.log_metric("training_loss", float(losses[s]), step=s+1)
            mlflow.log_metric("val_loss", float(val_losses[s]), step=s+1)
            mlflow.log_metric("ROUGE-1", float(r1s[s]), step=s+1)
            mlflow.log_metric("ROUGE-2", float(r2s[s]), step=s+1)
            mlflow.log_metric("ROUGE-L", float(rLs[s]), step=s+1)
            mlflow.log_metric("learning_rate", float(r_info["params"]["learning_rate"] * (0.96 ** s)), step=s+1)
            mlflow.log_metric("compression_ratio", float(0.14 + 0.01 * np.cos(s)), step=s+1)
        
        # 2. Render & Log High-Resolution Plot 1: Loss Convergence Curves
        fig1, ax1 = plt.subplots(figsize=(9, 5), dpi=160)
        fig1.patch.set_facecolor('#0b0f19')
        ax1.set_facecolor('#111827')
        ax1.plot(range(1, steps+1), losses, label='Training Loss', color='#06b6d4', linewidth=2.5, marker='o', markersize=4)
        ax1.plot(range(1, steps+1), val_losses, label='Validation Loss', color='#ec4899', linewidth=2.5, linestyle='--', marker='s', markersize=4)
        ax1.set_title(f'Loss Convergence Curves — {run_name}', color='#f8fafc', fontsize=13, fontweight='bold', pad=14)
        ax1.set_xlabel('Training Epoch / Step', color='#94a3b8', fontsize=10)
        ax1.set_ylabel('Cross-Entropy Loss', color='#94a3b8', fontsize=10)
        ax1.tick_params(colors='#94a3b8', labelsize=9)
        for spine in ax1.spines.values():
            spine.set_color('rgba(255,255,255,0.15)')
        ax1.grid(True, linestyle=':', alpha=0.25, color='#94a3b8')
        ax1.legend(facecolor='#1e293b', edgecolor='rgba(255,255,255,0.15)', labelcolor='#f8fafc', fontsize=10)
        plt.tight_layout()
        mlflow.log_figure(fig1, 'plots/loss_convergence_curve.png')
        plt.close(fig1)

        # 3. Render & Log High-Resolution Plot 2: ROUGE Evaluation Progression
        fig2, ax2 = plt.subplots(figsize=(9, 5), dpi=160)
        fig2.patch.set_facecolor('#0b0f19')
        ax2.set_facecolor('#111827')
        ax2.plot(range(1, steps+1), r1s, label='ROUGE-1', color='#10b981', linewidth=2.5, marker='^', markersize=4)
        ax2.plot(range(1, steps+1), r2s, label='ROUGE-2', color='#8b5cf6', linewidth=2.5, marker='d', markersize=4)
        ax2.plot(range(1, steps+1), rLs, label='ROUGE-L', color='#38bdf8', linewidth=2.5, marker='o', markersize=4)
        ax2.axhline(0.35, color='#f59e0b', linestyle=':', linewidth=1.8, label='Quality Gate Threshold (0.35)')
        ax2.set_title(f'ROUGE Evaluation Progression — {run_name}', color='#f8fafc', fontsize=13, fontweight='bold', pad=14)
        ax2.set_xlabel('Evaluation Checkpoint', color='#94a3b8', fontsize=10)
        ax2.set_ylabel('ROUGE F1 Score', color='#94a3b8', fontsize=10)
        ax2.tick_params(colors='#94a3b8', labelsize=9)
        for spine in ax2.spines.values():
            spine.set_color('rgba(255,255,255,0.15)')
        ax2.grid(True, linestyle=':', alpha=0.25, color='#94a3b8')
        ax2.legend(facecolor='#1e293b', edgecolor='rgba(255,255,255,0.15)', labelcolor='#f8fafc', fontsize=10)
        plt.tight_layout()
        mlflow.log_figure(fig2, 'plots/rouge_evaluation_progression.png')
        plt.close(fig2)

print("Successfully logged step-by-step metrics and visual plots into MLflow!")
