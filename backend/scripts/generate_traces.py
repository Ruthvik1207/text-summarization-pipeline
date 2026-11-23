import os
import sys
import io
from pathlib import Path

# Force UTF-8 encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.summarizer import summarizer_service
from app.services.mlflow_service import mlflow_service
from app.config import settings

def main():
    print(f"Connecting to MLflow Tracking Server at {settings.MLFLOW_TRACKING_URI}...")
    print(f"Target Experiment: {settings.MLFLOW_EXPERIMENT_NAME}")
    
    sample_texts = [
        {
            "title": "Quantum Computing Breakthrough in Fault-Tolerant Qubits",
            "text": (
                "Researchers at Harvard University and QuEra Computing have achieved a groundbreaking milestone in quantum computing "
                "by demonstrating the execution of complex quantum algorithms on 48 logical, fault-tolerant qubits. "
                "Neutral atom quantum architecture was utilized, which traps atoms in optical tweezers and manipulates them with lasers. "
                "This achievement significantly suppresses error rates that have historically limited quantum advantage. "
                "The scientific community anticipates that this architectural paradigm could accelerate practical quantum applications "
                "in cryptography, molecular dynamics simulation, and optimization by several years."
            )
        },
        {
            "title": "Transformer Attention Optimization & Long Context Scaling",
            "text": (
                "Modern sequence-to-sequence transformers often struggle with quadratic computational complexity when processing voluminous "
                "documents. To address this, recursive chunking and selective cross-attention mechanisms allow linear scaling over extensive "
                "token sequences. By segmenting lengthy inputs into semantically cohesive paragraphs and generating progressive intermediate "
                "abstractive summaries, modern architectures maintain high factual consistency while avoiding memory out-of-bounds exceptions."
            )
        },
        {
            "title": "Continuous MLOps & Real-Time Drift Detection in NLP",
            "text": (
                "Deploying natural language processing models in production requires robust continuous monitoring infrastructure. "
                "Statistical tests such as the Kolmogorov-Smirnov test detect subtle distribution shifts in user query lengths, vocabulary complexity, "
                "and latency degradation before catastrophic model drift occurs. When combined with automated quality gates and automated "
                "MLflow candidate model registration, machine learning teams can safely retrain checkpoints with zero human intervention."
            )
        }
    ]

    print(f"\nGenerating {len(sample_texts)} real summarization execution traces...")
    for idx, item in enumerate(sample_texts, 1):
        print(f"\n[{idx}/{len(sample_texts)}] Summarizing: '{item['title']}'...")
        res = summarizer_service.summarize(
            text=item["text"],
            title=item["title"],
            max_length=120,
            min_length=30
        )
        print(f"  Summary: {res['summary']}")
        print(f"  Compression: {res['compression_ratio']:.1%} | Latency: {res['processing_time_ms']}ms")

    # Check status
    status = mlflow_service.get_status()
    print("\n================ MLflow Traces Telemetry ================")
    print(f"MLflow Connected: {status.get('is_connected')}")
    print(f"Traces Count:     {status.get('traces_count')}")
    print(f"Latest Trace ID:  {status.get('latest_trace_id')}")
    print(f"Traces Direct Link: {status.get('traces_url')}")
    print("=========================================================\n")

if __name__ == "__main__":
    main()
