from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


# ============================================================================
# Schémas pour QuoteLine
# ============================================================================

class QuoteLineBase(BaseModel):
    description: str = Field(..., min_length=1, description="Description de la ligne")
    quantity: Decimal = Field(..., gt=0, description="Quantité")
    unit: Optional[str] = Field(None, max_length=20, description="Unité de mesure (ex: heure, pièce, kg)")
    unit_price_ht: Decimal = Field(..., ge=0, description="Prix unitaire HT")
    tax_rate: Decimal = Field(..., ge=0, le=100, description="Taux de TVA en pourcentage")
    order: int = Field(..., ge=0, description="Ordre d'affichage")


class QuoteLineCreate(QuoteLineBase):
    pass


class QuoteLineUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, max_length=20)
    unit_price_ht: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    order: Optional[int] = Field(None, ge=0)


class QuoteLineRead(QuoteLineBase):
    id: int
    quote_id: int
    subtotal_ht: Decimal
    tax_amount: Decimal
    total_ttc: Decimal
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour Quote
# ============================================================================

class QuoteBase(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    conditions: Optional[str] = None
    valid_until: Optional[datetime] = None  # Durée de validité du devis
    service_start_date: Optional[datetime] = None  # Date de début de prestation
    execution_duration: Optional[str] = None  # Durée ou délai d'exécution
    discount_type: Optional[str] = Field(None, description="Type de réduction: 'percentage' ou 'fixed'")
    discount_value: Optional[Decimal] = Field(None, ge=0, description="Valeur de la réduction (en % ou en €)")
    discount_label: Optional[str] = Field(None, description="Libellé de la réduction (ex: 'Remise commerciale', 'Escompte 2%')")


class QuoteCreate(QuoteBase):
    lines: List[QuoteLineCreate] = Field(..., min_items=1, description="Lignes du devis")


class QuoteUpdate(BaseModel):
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    conditions: Optional[str] = None
    valid_until: Optional[datetime] = None
    service_start_date: Optional[datetime] = None
    execution_duration: Optional[str] = None
    discount_type: Optional[str] = Field(None, description="Type de réduction: 'percentage' ou 'fixed'")
    discount_value: Optional[Decimal] = Field(None, ge=0, description="Valeur de la réduction (en % ou en €)")
    discount_label: Optional[str] = Field(None, description="Libellé de la réduction")
    lines: Optional[List[QuoteLineCreate]] = None
    updated_at: Optional[datetime] = Field(None, description="Timestamp de la dernière modification pour optimistic locking")


class QuoteRead(QuoteBase):
    id: int
    company_id: int
    number: str
    amount: Decimal
    subtotal_ht: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_ttc: Optional[Decimal] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    refused_at: Optional[datetime] = None
    client_signature_path: Optional[str] = None
    public_token: Optional[str] = None
    public_token_expires_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    service_start_date: Optional[datetime] = None
    execution_duration: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    discount_label: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[QuoteLineRead] = []
    client_name: Optional[str] = None
    client_email: Optional[str] = None  # Email du client pour validation côté frontend
    project_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour l'envoi d'email personnalisé
# ============================================================================

class QuoteEmailSend(BaseModel):
    subject: str = Field(..., min_length=1, description="Sujet de l'email")
    content: str = Field(..., min_length=1, description="Contenu de l'email")
    additional_recipients: Optional[List[str]] = Field(None, description="Destinataires supplémentaires (emails)")
    additional_attachments: Optional[List[str]] = Field(None, description="Chemins des pièces jointes supplémentaires")
