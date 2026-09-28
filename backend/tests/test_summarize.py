def test_summarize_success(client):
    article_text = (
        "Artificial Intelligence has experienced rapid advancement over the past several years, "
        "particularly with the development of deep transformer models and attention mechanisms. "
        "These models are now utilized widely across healthcare, financial analysis, software engineering, "
        "and automated scientific discovery to analyze large corpuses of unstructured textual information."
    )
    payload = {
        "text": article_text,
        "title": "AI Advancement Overview",
        "max_length": 80,
        "min_length": 20
    }
    response = client.post("/api/v1/summarize", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "summary" in data
    assert len(data["summary"]) > 0
    assert data["model_name"] == "google/flan-t5-small"
    assert data["input_characters"] > 0
    assert data["input_words"] > 0
    assert data["summary_words"] > 0
    assert 0.0 < data["compression_ratio"] < 2.0
    assert data["processing_time_ms"] > 0
    assert data["title"] == "AI Advancement Overview"
    assert data["request_id"] is not None

def test_summarize_batch(client):
    payload = {
        "items": [
            {
                "id": "item-1",
                "text": "The Transformer architecture has fundamentally reshaped artificial intelligence and natural language processing across multiple domains.",
                "title": "Transformers",
                "reference_summary": "Transformers revolutionized artificial intelligence and NLP."
            },
            {
                "id": "item-2",
                "text": "Solar and wind energy installations have grown exponentially over the past decade, lowering emissions globally.",
                "title": "Renewable Energy"
            }
        ],
        "max_length": 60,
        "min_length": 15
    }
    response = client.post("/api/v1/summarize/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 2
    assert data["successful"] == 2
    assert len(data["results"]) == 2
    assert len(data["results"][0]["summary"]) > 0
    assert data["results"][0]["rougeL"] is not None

