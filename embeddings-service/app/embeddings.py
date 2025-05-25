from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Union
import torch
from app.config import get_settings

class EmbeddingModel:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if EmbeddingModel._model is None:
            settings = get_settings()
            EmbeddingModel._model = SentenceTransformer(settings.model_name)
            # Move model to GPU if available
            if torch.cuda.is_available():
                EmbeddingModel._model = EmbeddingModel._model.to('cuda')

    def get_embeddings(
        self,
        texts: List[str],
        normalize: bool = True
    ) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        """
        # Convert texts to embeddings
        embeddings = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=normalize
        )
        return embeddings

def get_embeddings(
    texts: List[str],
    normalize: bool = True
) -> np.ndarray:
    """
    Get embeddings using the singleton model instance
    """
    model = EmbeddingModel.get_instance()
    return model.get_embeddings(texts, normalize) 