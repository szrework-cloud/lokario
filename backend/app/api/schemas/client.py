from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class ClientBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    sector: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    siret: Optional[str] = None
    notes: Optional[str] = None
    type: Optional[str] = "Client"  # "Client" ou "Fournisseur"
    tags: Optional[List[str]] = None  # ["VIP", "régulier", "nouveau"]


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    sector: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    siret: Optional[str] = None
    notes: Optional[str] = None
    type: Optional[str] = None
    tags: Optional[List[str]] = None


class ClientRead(ClientBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ClientWithStats(ClientRead):
    """Client avec statistiques calculées (optionnel, pour les listes)"""
    tasks_count: Optional[int] = 0
    reminders_count: Optional[int] = 0
    invoices_count: Optional[int] = 0
    total_invoiced: Optional[float] = 0.0
    total_paid: Optional[float] = 0.0
    open_projects: Optional[int] = 0
    last_contact: Optional[datetime] = None

