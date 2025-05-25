import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_embeddings_endpoint():
    """Test the embeddings endpoint with valid input"""
    response = client.post(
        "/embeddings",
        json={
            "texts": ["Hello world", "How are you?"],
            "normalize": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "embeddings" in data
    assert "model" in data
    assert "dimension" in data
    assert len(data["embeddings"]) == 2
    assert data["model"] == "all-MiniLM-L6-v2"
    assert data["dimension"] == 384

def test_embeddings_empty_texts():
    """Test the embeddings endpoint with empty texts"""
    response = client.post(
        "/embeddings",
        json={
            "texts": [],
            "normalize": True
        }
    )
    assert response.status_code == 400
    assert "No texts provided" in response.json()["detail"]

def test_embeddings_too_many_texts():
    """Test the embeddings endpoint with too many texts"""
    # Create a list with more than the default max_batch_size (32)
    texts = [f"Text {i}" for i in range(50)]
    response = client.post(
        "/embeddings",
        json={
            "texts": texts,
            "normalize": True
        }
    )
    assert response.status_code == 400
    assert "Batch size exceeds maximum" in response.json()["detail"] 