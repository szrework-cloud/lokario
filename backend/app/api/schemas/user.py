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
    company_code: Optional[str] = None  # Code à 6 chiffres pour rejoindre une entreprise existante
    sector: Optional[str] = None  # Secteur de l'entreprise si création


class UserUpdate(BaseModel):
    role: Optional[str] = None
    company_id: Optional[int] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    can_edit_tasks: Optional[bool] = None
    can_delete_tasks: Optional[bool] = None
    can_create_tasks: Optional[bool] = None


class UserPermissionsUpdate(BaseModel):
    """Schéma pour mettre à jour uniquement les permissions d'un utilisateur"""
    can_edit_tasks: Optional[bool] = None
    can_delete_tasks: Optional[bool] = None
    can_create_tasks: Optional[bool] = None


class UserRead(UserBase):
    id: int
    is_active: bool
    email_verified: bool  # Ajout du champ email_verified
    created_at: datetime
    can_edit_tasks: Optional[bool] = False
    can_delete_tasks: Optional[bool] = False
    can_create_tasks: Optional[bool] = False
    
    class Config:
        from_attributes = True


class UserWithCompany(UserRead):
    """User avec les infos de son entreprise."""
    company_name: Optional[str] = None
    company_sector: Optional[str] = None
    company_code: Optional[str] = None

