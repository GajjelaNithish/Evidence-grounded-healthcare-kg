from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.auth.dependencies import get_current_user, verify_patient_access
from app.query.schemas import QueryRequest, QueryResponse
from app.query.fusion import fuse_and_gate_evidence
from app.query.synthesizer import synthesize_grounded_answer

router = APIRouter(prefix="/query", tags=["Query"])

@router.post("", response_model=QueryResponse)
async def execute_clinical_query(
    request: Request,
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check patient access permission
    has_access = await verify_patient_access(body.patient_id, current_user, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have access to patient {body.patient_id}"
        )

    # 1. Hybrid Retrieval, Fusion Scoring, and Sufficiency Gating
    graph_evidence, doc_evidence, fused_score, routing_decision, temporal_filter = fuse_and_gate_evidence(
        patient_id=body.patient_id,
        query=body.query
    )

    # 2. Synthesize Grounded Clinical Response
    answer = await synthesize_grounded_answer(
        query=body.query,
        patient_id=body.patient_id,
        graph_evidence=graph_evidence,
        doc_evidence=doc_evidence,
        fused_score=fused_score,
        routing_decision=routing_decision,
        temporal_filter=temporal_filter
    )

    # 3. Record Audit Log Entry
    audit = AuditLog(
        user_id=current_user.id,
        action="CLINICAL_QUERY",
        clinical_patient_id=body.patient_id,
        details={
            "query": body.query,
            "fused_score": fused_score,
            "routing_decision": routing_decision,
            "graph_evidence_count": len(graph_evidence),
            "doc_evidence_count": len(doc_evidence),
            "temporal_filter": temporal_filter
        },
        ip_address=request.client.host if request.client else None
    )
    db.add(audit)
    await db.commit()

    return QueryResponse(
        answer=answer,
        confidence_score=fused_score,
        patient_id=body.patient_id,
        document_evidence=doc_evidence,
        graph_evidence=graph_evidence,
        temporal_filter_applied=temporal_filter,
        routing_decision=routing_decision
    )

@router.get("/history/{patient_id}")
async def get_query_history(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    has_access = await verify_patient_access(patient_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    stmt = select(AuditLog).where(
        AuditLog.clinical_patient_id == patient_id,
        AuditLog.action == "CLINICAL_QUERY"
    ).order_by(desc(AuditLog.created_at)).limit(20)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "created_at": log.created_at,
            "query": log.details.get("query") if log.details else "",
            "fused_score": log.details.get("fused_score") if log.details else 0.0,
            "routing_decision": log.details.get("routing_decision") if log.details else "hybrid"
        }
        for log in logs
    ]
