def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_name" in data
    assert "model_loaded" in data
    assert "mlflow_connected" in data
    assert "timestamp" in data

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "Text Summarization Pipeline"
    assert data["status"] == "online"

def test_model_info_endpoint(client):
    response = client.get("/api/v1/model")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "architecture" in data
    assert "parameters_count" in data
    assert "device" in data
