"""
Schémas Pydantic pour les templates de lignes de facturation.
"""
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional
from datetime import datetime


class BillingLineTemplateBase(BaseModel):
    description: str = Field(..., description="Description de la ligne")
    unit: Optional[str] = Field(None, max_length=20, description="Unité de mesure (ex: heure, pièce, kg)")
    unit_price_ht: Decimal = Field(..., ge=0, description="Prix unitaire HT")
    tax_rate: Decimal = Field(..., ge=0, le=100, description="Taux de TVA en pourcentage")


class BillingLineTemplateCreate(BillingLineTemplateBase):
    pass


class BillingLineTemplateUpdate(BaseModel):
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=20)
    unit_price_ht: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)


class BillingLineTemplateRead(BillingLineTemplateBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

