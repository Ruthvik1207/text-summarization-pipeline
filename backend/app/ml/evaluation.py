import time
from typing import Dict, List, Any
from app.utils.logger import logger

def compute_rouge_scores(predictions: List[str], references: List[str]) -> Dict[str, float]:
    """Computes ROUGE-1, ROUGE-2, and ROUGE-L metrics."""
    try:
        import evaluate
        rouge = evaluate.load('rouge')
        results = rouge.compute(predictions=predictions, references=references, use_stemmer=True)
        return {
            "rouge1": round(float(results.get("rouge1", 0.0)), 4),
            "rouge2": round(float(results.get("rouge2", 0.0)), 4),
            "rougeL": round(float(results.get("rougeL", 0.0)), 4),
            "rougeLsum": round(float(results.get("rougeLsum", 0.0)), 4),
        }
    except Exception as e:
        logger.warning(f"Evaluate package encountered issue ({e}), computing with rouge_score...")
        try:
            from rouge_score import rouge_scorer
            scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
            r1, r2, rl = [], [], []
            for p, r in zip(predictions, references):
                score = scorer.score(r, p)
                r1.append(score['rouge1'].fmeasure)
                r2.append(score['rouge2'].fmeasure)
                rl.append(score['rougeL'].fmeasure)
            return {
                "rouge1": round(sum(r1) / max(len(r1), 1), 4),
                "rouge2": round(sum(r2) / max(len(r2), 1), 4),
                "rougeL": round(sum(rl) / max(len(rl), 1), 4),
                "rougeLsum": round(sum(rl) / max(len(rl), 1), 4),
            }
        except Exception as ex:
            logger.error(f"Fallback rouge calculation failed: {ex}")
            return {"rouge1": 0.0, "rouge2": 0.0, "rougeL": 0.0, "rougeLsum": 0.0}

def compute_summary_stats(input_text: str, summary_text: str, duration_sec: float) -> Dict[str, Any]:
    """Calculates words, character counts, compression ratio, and processing time."""
    in_chars = len(input_text)
    in_words = len(input_text.split())
    out_words = len(summary_text.split())
    
    # Compression ratio = summary_words / input_words
    ratio = round(out_words / max(in_words, 1), 4)
    ms = int(duration_sec * 1000)
    
    return {
        "input_characters": in_chars,
        "input_words": in_words,
        "summary_words": out_words,
        "compression_ratio": ratio,
        "processing_time_ms": ms
    }
