from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class QueryRequest(BaseModel):
    query: str = Field(..., example="What treatment did the patient receive for diabetes and when was it administered?")
    patient_id: str = Field(..., example="1")

class DocumentEvidence(BaseModel):
    chunk_text: str
    source_filename: str
    chunk_index: int
    score: float

class GraphEvidence(BaseModel):
    node_type: str
    name: str
    relationship: str
    details: Dict[str, Any] = Field(default_factory=dict)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    temporal_status: str = Field(default="historical", description="'active', 'historical', 'unbounded', or 'resolved'")
    confidence: float = 1.0
    score: float = 1.0

class QueryResponse(BaseModel):
    answer: str
    confidence_score: float
    patient_id: str
    document_evidence: List[DocumentEvidence] = Field(default_factory=list)
    graph_evidence: List[GraphEvidence] = Field(default_factory=list)
    temporal_filter_applied: Optional[str] = None
    routing_decision: str = Field(default="hybrid", description="'graph_only', 'vector_only', 'hybrid', or 'insufficient_evidence'")
    disclaimer: str = Field(
        default="ClinicalKG is an AI research prototype. Outputs must be verified by a licensed clinician before clinical use."
    )
