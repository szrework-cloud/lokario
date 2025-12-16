from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CompanyBase(BaseModel):
    name: str
    sector: Optional[str] = None

    # Gestion TVA et auto-entrepreneurs (l'entreprise qui crée les factures)
    is_auto_entrepreneur: Optional[bool] = False
    vat_exempt: Optional[bool] = False
    vat_exemption_reference: Optional[str] = None  # Article CGI (ex: "Art. 293 B du CGI")


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    
    # Gestion TVA et auto-entrepreneurs
    is_auto_entrepreneur: Optional[bool] = None
    vat_exempt: Optional[bool] = None
    vat_exemption_reference: Optional[str] = None


class CompanyRead(CompanyBase):
    id: int
    code: str
    slug: Optional[str] = None
    is_active: bool
    is_auto_entrepreneur: bool
    vat_exempt: bool
    vat_exemption_reference: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

