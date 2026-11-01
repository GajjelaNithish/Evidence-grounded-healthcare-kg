import logging
import re
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

def clean_markdown_artifacts(text: str) -> str:
    """
    Cleans raw markdown bold/italic asterisks while preserving
    clean section headings, bulleted lists (- or numbered), and citations.
    """
    if not text:
        return ""

    # Replace **bold** with plain text
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    # Replace __bold__ with plain text
    text = re.sub(r"__(.*?)__", r"\1", text)
    
    # Clean single-asterisk italics where surrounded by word chars
    text = re.sub(r"(?<!\*)\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)", r"\1", text)

    # Normalize list bullets: lines starting with * or + to standard clean -
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("* ") or stripped.startswith("+ "):
            indent = len(line) - len(line.lstrip())
            lines.append(" " * indent + "- " + stripped[2:])
        else:
            lines.append(line)
    text = "\n".join(lines)

    # Remove isolated or stray asterisks
    text = re.sub(r"(?<!\w)\*(?!\w)", "", text)

    # Clean double spaces before punctuation
    text = re.sub(r"[ \t]+([,.:;])", r"\1", text)

    return text.strip()

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
        
        detail_strs = []
        if g.details:
            for k, v in g.details.items():
                if v and k not in ("normalized_name",):
                    detail_strs.append(f"{k}: {v}")
        detail_text = f" [{', '.join(detail_strs)}]" if detail_strs else ""
        graph_lines.append(f"- [{g.node_type}] {g.name}{temporal_info}{detail_text} | Source: {g.details.get('source', 'EHR')}")

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
6. COMPLEX & MULTI-PART QUESTIONS:
   - If the clinician's query contains multiple questions or information requirements, address each requirement under a distinct section or numbered list.
   - If evidence is available for one part of the question but unavailable for another part, answer the evidenced part fully and clearly state: "Information regarding [topic] is not documented in the available patient records."
7. FORMATTING & READABILITY:
   - Present a clean, well-structured response using plain text with standard dashes (-) for bullet points.
   - Do NOT use raw markdown double asterisks (**) or unnecessary asterisks around headings, medication names, or diagnoses.
   - Begin with a direct answer to the question asked, followed optionally by a brief Reason / Clinical Context section.
"""

    llm = get_llm_client()
    try:
        raw_answer = await llm.generate_response(prompt)
        clean_answer = clean_markdown_artifacts(raw_answer)
        return clean_answer
    except Exception as e:
        logger.error(f"Error during answer synthesis: {e}")
        return f"Clinical synthesis error: {e}. Graph and document evidence remain available below."