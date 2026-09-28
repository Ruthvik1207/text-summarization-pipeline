from app.ml.preprocessor import clean_text, chunk_text
from app.ml.evaluation import compute_rouge_scores, compute_summary_stats
from app.ml.model_loader import model_manager

def test_clean_text():
    dirty = "   This  is   a   \r\n\r\n text \t with   extra   spaces.   "
    cleaned = clean_text(dirty)
    assert cleaned == "This is a \n\n text with extra spaces."

def test_chunk_text_short():
    short = "This is a short text."
    chunks = chunk_text(short, max_words_per_chunk=100)
    assert len(chunks) == 1
    assert chunks[0] == short

def test_chunk_text_long():
    long_text = " ".join([f"Sentence {i} describing an interesting concept in engineering." for i in range(100)])
    chunks = chunk_text(long_text, max_words_per_chunk=50)
    assert len(chunks) > 1

def test_compute_rouge_scores():
    preds = ["The rapid brown fox leaps over a sleeping canine."]
    refs = ["The quick brown fox jumps over the lazy dog."]
    scores = compute_rouge_scores(preds, refs)
    assert "rouge1" in scores
    assert "rouge2" in scores
    assert "rougeL" in scores
    assert 0.0 <= scores["rouge1"] <= 1.0

def test_compute_summary_stats():
    inp = "one two three four five six seven eight nine ten"
    out = "one two three"
    stats = compute_summary_stats(inp, out, 0.5)
    assert stats["input_words"] == 10
    assert stats["summary_words"] == 3
    assert stats["compression_ratio"] == 0.3
    assert stats["processing_time_ms"] == 500

def test_model_manager_singleton():
    m1 = model_manager
    from app.ml.model_loader import ModelManager
    m2 = ModelManager.get_instance()
    assert m1 is m2
