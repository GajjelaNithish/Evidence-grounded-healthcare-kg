from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.schemas import LoginRequest, TokenResponse, UserOut
from app.auth.service import authenticate_user, create_access_token
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

from sqlalchemy import select
from app.models.patient import Patient

async def _build_user_out(user: User, db: AsyncSession) -> UserOut:
    user_out = UserOut.model_validate(user)
    if user.clinical_patient_id:
        stmt = select(Patient).where(Patient.patient_id == user.clinical_patient_id)
        p = (await db.execute(stmt)).scalar_one_or_none()
        if p:
            user_out.patient_profile_data = {
                "id": str(p.id),
                "patient_id": p.patient_id,
                "name": p.name,
                "date_of_birth": p.date_of_birth,
                "age": p.age,
                "gender": p.gender,
                "address": p.address,
                "contact": p.contact
            }
    return user_out

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    user_out = await _build_user_out(user, db)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRY_SECONDS,
        user=user_out
    )

@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await _build_user_out(current_user, db)
