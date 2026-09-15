import logging
from typing import List, Optional
from app.query.schemas import GraphEvidence, DocumentEvidence
from app.llm.client import get_llm_client

logger = logging.getLogger(__name__)

INSUFFICIENT_EVIDENCE_TEMPLATE = (
    "ClinicalKG Insufficient Evidence Notice: The patient records and knowledge graph for Patient {patient_id} "
    "do not contain sufficient clinical evidence (confidence score: {score:.2f} < threshold) to answer this question. "
    "To adhere to clinical safety standards and prevent hallucinations, no speculative answer has been generated. "
    "Please upload relevant clinical documentation or verify the patient identifier."
)

async def synthesize_grounded_answer(
    query: str,
    patient_id: str,
    graph_evidence: List[GraphEvidence],
    doc_evidence: List[DocumentEvidence],
    fused_score: float,
    routing_decision: str,
    temporal_filter: Optional[str] = None
) -> str:
    """Synthesizes clinical response grounded strictly in retrieved graph & document evidence."""
    # Deterministic Sufficiency Gate: Reject speculative answers
    if routing_decision == "insufficient_evidence":
        return INSUFFICIENT_EVIDENCE_TEMPLATE.format(patient_id=patient_id, score=fused_score)

    # Format Graph Facts
    graph_lines = []
    for g in graph_evidence:
        temporal_info = f" (Status: {g.temporal_status}"
        if g.valid_from:
            temporal_info += f", Valid from: {g.valid_from}"
        if g.valid_to:
            temporal_info += f", Valid to: {g.valid_to}"
        temporal_info += ")"
        graph_lines.append(f"- [{g.node_type}] {g.name}{temporal_info} | Source: {g.details.get('source', 'EHR')}")

    graph_block = "\n".join(graph_lines) if graph_lines else "No direct graph relationships matched."

    # Format Document Chunks
    doc_lines = []
    for d in doc_evidence:
        doc_lines.append(f"--- [Doc: {d.source_filename}, Chunk: {d.chunk_index}, Relevance: {d.score:.2f}] ---\n{d.chunk_text}")

    doc_block = "\n\n".join(doc_lines) if doc_lines else "No relevant document chunks retrieved."

    prompt = f"""You are ClinicalKG, an AI clinical assistant for verified clinicians.
Analyze the following patient evidence to answer the query accurately.

PATIENT ID: {patient_id}
TEMPORAL FILTER: {temporal_filter or 'None (All dates considered)'}

==================== STRUCTURED GRAPH EVIDENCE ====================
{graph_block}

==================== CLINICAL DOCUMENT PASSAGES ====================
{doc_block}

==================== CLINICAL QUESTION ====================
{query}

CRITICAL RULES:
1. Base your answer EXCLUSIVELY on the evidence provided above.
2. Cite every fact using [Graph: <Entity>] or [Doc: <filename>, Chunk: <index>].
3. Clearly distinguish between ACTIVE conditions/treatments and HISTORICAL/RESOLVED ones.
4. If the evidence is incomplete or inconclusive on any detail, explicitly state the limitation.
5. Do not recommend therapies not explicitly evidenced in the records.
"""

    llm = get_llm_client()
    try:
        answer = await llm.generate_response(prompt)
        return answer
    except Exception as e:
        logger.error(f"Error during answer synthesis: {e}")
        return f"Clinical synthesis error: {e}. Graph and document evidence remain available below."
