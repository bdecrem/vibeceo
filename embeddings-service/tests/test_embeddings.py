import pytest
import numpy as np
from app.embeddings import EmbeddingModel, get_embeddings

@pytest.mark.asyncio
async def test_embedding_model_singleton():
    """Test that EmbeddingModel follows singleton pattern"""
    model1 = EmbeddingModel.get_instance()
    model2 = EmbeddingModel.get_instance()
    assert model1 is model2

@pytest.mark.asyncio
async def test_get_embeddings():
    """Test the get_embeddings function"""
    texts = ["Hello world", "How are you?"]
    embeddings = await get_embeddings(texts, normalize=True)
    
    assert isinstance(embeddings, np.ndarray)
    assert embeddings.shape[0] == len(texts)
    assert embeddings.shape[1] == 384  # all-MiniLM-L6-v2 dimension
    
    # Check that embeddings are normalized (L2 norm should be close to 1)
    norms = np.linalg.norm(embeddings, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-6)

@pytest.mark.asyncio
async def test_get_embeddings_unnormalized():
    """Test the get_embeddings function without normalization"""
    texts = ["Hello world"]
    embeddings = await get_embeddings(texts, normalize=False)
    
    assert isinstance(embeddings, np.ndarray)
    assert embeddings.shape[0] == len(texts)
    assert embeddings.shape[1] == 384
    
    # Check that embeddings are not normalized
    norm = np.linalg.norm(embeddings[0])
    assert not np.isclose(norm, 1.0, atol=1e-6)

@pytest.mark.asyncio
async def test_different_texts_different_embeddings():
    """Test that different texts produce different embeddings"""
    texts = ["Hello world", "Goodbye world"]
    embeddings = await get_embeddings(texts, normalize=True)
    
    # Embeddings should be different
    assert not np.allclose(embeddings[0], embeddings[1])
    
    # But similar texts should have high cosine similarity
    similarity = np.dot(embeddings[0], embeddings[1])
    assert similarity > 0.5  # Should be somewhat similar due to "world" 