def test_metrics_endpoint(client):
    response = client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_summaries" in data
    assert "avg_processing_time" in data
    assert "volume_by_date" in data
    assert "length_distribution" in data

def test_monitoring_endpoint(client):
    response = client.get("/api/v1/monitoring")
    assert response.status_code == 200
    data = response.json()
    assert "total_predictions" in data
    assert "avg_compression_ratio" in data
    assert "drift_detected" in data
    assert "drift_score" in data

def test_dataset_endpoint(client):
    response = client.get("/api/v1/dataset")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "num_records" in data
    assert "splits" in data
    assert "features" in data

def test_mlflow_endpoint(client):
    response = client.get("/api/v1/mlflow")
    assert response.status_code == 200
    data = response.json()
    assert "tracking_uri" in data
    assert "is_connected" in data
    assert "experiment_name" in data
