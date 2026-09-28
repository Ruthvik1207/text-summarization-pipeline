def test_feedback_submission(client):
    payload = {
        "summary_id": "test-uuid-1234",
        "is_useful": True,
        "rating": 5,
        "comment": "Accurate and preserved all core information."
    }
    response = client.post("/api/v1/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "feedback_id" in data

def test_training_status_not_found_on_bogus_id(client):
    response = client.get("/api/v1/training/status?job_id=non-existent-id")
    assert response.status_code == 404
