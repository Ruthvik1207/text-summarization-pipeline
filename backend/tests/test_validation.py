def test_summarize_empty_text(client):
    response = client.post("/api/v1/summarize", json={"text": ""})
    assert response.status_code == 400
    assert "detail" in response.json()

def test_summarize_whitespace_only(client):
    response = client.post("/api/v1/summarize", json={"text": "      \n\t   "})
    assert response.status_code == 400

def test_summarize_too_short_text(client):
    response = client.post("/api/v1/summarize", json={"text": "Short hello"})
    assert response.status_code == 400
    assert "too short" in response.json()["detail"].lower()

def test_summarize_min_greater_than_max(client):
    response = client.post(
        "/api/v1/summarize",
        json={
            "text": "This is a sufficiently long test document written to verify that input parameter validation functions correctly across all boundary conditions.",
            "min_length": 150,
            "max_length": 50
        }
    )
    assert response.status_code == 400
    assert "min_length" in response.json()["detail"].lower()

def test_summarize_invalid_max_length_bounds(client):
    response = client.post(
        "/api/v1/summarize",
        json={
            "text": "This is a sufficiently long document designed to test boundary conditions on integer parameters.",
            "max_length": 1000  # greater than le=512
        }
    )
    assert response.status_code == 400
