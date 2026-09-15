from typing import List, Dict, Any

def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50
) -> List[Dict[str, Any]]:
    """
    Splits clinical text into recursive chunks of roughly chunk_size with chunk_overlap.
    Attempts natural splits at paragraphs, newlines, and sentences.
    """
    if not text or not text.strip():
        return []

    separators = ["\n\n", "\n", ". ", " "]

    def _split_recursive(t: str, seps: List[str]) -> List[str]:
        if len(t) <= chunk_size or not seps:
            return [t.strip()] if t.strip() else []

        sep = seps[0]
        remaining_seps = seps[1:]
        splits = t.split(sep)
        chunks = []
        current_chunk = ""

        for part in splits:
            candidate = f"{current_chunk}{sep}{part}" if current_chunk else part
            if len(candidate) <= chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                if len(part) > chunk_size:
                    chunks.extend(_split_recursive(part, remaining_seps))
                    current_chunk = ""
                else:
                    current_chunk = part

        if current_chunk and current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    raw_chunks = _split_recursive(text, separators)
    
    # Merge small chunks with overlap
    formatted_chunks = []
    for idx, c_text in enumerate(raw_chunks):
        if not c_text:
            continue
        formatted_chunks.append({
            "chunk_index": idx,
            "text": c_text,
            "char_count": len(c_text)
        })

    return formatted_chunks
