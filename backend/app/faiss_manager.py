import os
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import faiss

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 dimension

def get_index_path(patient_id: str) -> str:
    os.makedirs(settings.FAISS_DIR, exist_ok=True)
    return os.path.join(settings.FAISS_DIR, f"{patient_id}.index")

def get_meta_path(patient_id: str) -> str:
    os.makedirs(settings.FAISS_DIR, exist_ok=True)
    return os.path.join(settings.FAISS_DIR, f"{patient_id}_meta.json")

def load_patient_index(patient_id: str) -> tuple[Optional[faiss.IndexFlatIP], List[Dict[str, Any]]]:
    idx_path = get_index_path(patient_id)
    meta_path = get_meta_path(patient_id)

    if not os.path.exists(idx_path) or not os.path.exists(meta_path):
        return None, []

    try:
        index = faiss.read_index(idx_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        return index, metadata
    except Exception as e:
        logger.error(f"Error loading FAISS index for patient {patient_id}: {e}")
        return None, []

def save_patient_index(patient_id: str, index: faiss.IndexFlatIP, metadata: List[Dict[str, Any]]):
    idx_path = get_index_path(patient_id)
    meta_path = get_meta_path(patient_id)

    faiss.write_index(index, idx_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def add_chunks_to_patient_index(
    patient_id: str,
    chunks: List[Dict[str, Any]],
    embeddings: np.ndarray
):
    """
    Adds embeddings and chunk metadata to a patient's FAISS index.
    Embeddings MUST be normalized L2 vectors.
    """
    if len(chunks) == 0 or embeddings.shape[0] == 0:
        return

    index, metadata = load_patient_index(patient_id)

    if index is None:
        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        metadata = []

    # Ensure float32 format
    embeddings_np = np.ascontiguousarray(embeddings.astype(np.float32))

    index.add(embeddings_np)
    metadata.extend(chunks)

    save_patient_index(patient_id, index, metadata)
    logger.info(f"Indexed {len(chunks)} chunks for patient {patient_id}. Total: {index.ntotal}")

def search_patient_index(
    patient_id: str,
    query_embedding: np.ndarray,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Search nearest chunks in patient's FAISS index.
    query_embedding should be (384,) or (1, 384) normalized.
    Returns list of dicts with: text, score, source_filename, chunk_index.
    """
    index, metadata = load_patient_index(patient_id)
    if index is None or index.ntotal == 0:
        return []

    if query_embedding.ndim == 1:
        query_vec = np.expand_dims(query_embedding, axis=0)
    else:
        query_vec = query_embedding

    query_vec = np.ascontiguousarray(query_vec.astype(np.float32))

    k = min(top_k, index.ntotal)
    scores, indices = index.search(query_vec, k)

    results = []
    for rank in range(k):
        idx = indices[0][rank]
        score = float(scores[0][rank])
        if idx >= 0 and idx < len(metadata):
            meta = metadata[idx].copy()
            # Normalize inner product score from [-1, 1] to [0, 1]
            meta["score"] = max(0.0, min(1.0, (score + 1.0) / 2.0))
            results.append(meta)

    return results
