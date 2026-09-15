from typing import Optional, List
import numpy as np
from sentence_transformers import SentenceTransformer

_model: Optional[SentenceTransformer] = None
MODEL_NAME = "all-MiniLM-L6-v2"

def get_embedding_model() -> SentenceTransformer:
    """Singleton: loads all-MiniLM-L6-v2 model once."""
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model

def encode_text(text: str) -> np.ndarray:
    """Generate a normalized 384-dim embedding for a single string."""
    model = get_embedding_model()
    emb = model.encode([text], convert_to_numpy=True, normalize_embeddings=True)
    return emb[0].astype(np.float32)

def encode_batch(texts: List[str]) -> np.ndarray:
    """Generate normalized embeddings for a batch of strings."""
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    model = get_embedding_model()
    embs = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return embs.astype(np.float32)
