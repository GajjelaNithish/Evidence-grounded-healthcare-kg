from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

class LoginRequest(BaseModel):
    username: str = Field(..., example="admin")
    password: str = Field(..., example="admin123")

class UserOut(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: Literal["admin", "doctor", "patient"]
    clinical_patient_id: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Literal["admin", "doctor", "patient"]
    full_name: Optional[str] = None
    clinical_patient_id: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[Literal["admin", "doctor", "patient"]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
