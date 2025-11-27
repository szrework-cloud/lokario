from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    company_id: Optional[int] = None


class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # Si création d'entreprise en même temps
    sector: Optional[str] = None  # Secteur de l'entreprise si création


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

