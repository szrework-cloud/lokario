from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


# ============================================================================
# Schémas pour InvoiceLine
# ============================================================================

class InvoiceLineBase(BaseModel):
    description: str = Field(..., min_length=1, description="Description de la ligne")
    quantity: Decimal = Field(..., gt=0, description="Quantité")
    unit: Optional[str] = Field(None, max_length=20, description="Unité de mesure (ex: heure, pièce, kg)")
    unit_price_ht: Decimal = Field(..., ge=0, description="Prix unitaire HT")
    tax_rate: Decimal = Field(..., ge=0, le=100, description="Taux de TVA en pourcentage")
    order: int = Field(..., ge=0, description="Ordre d'affichage")


class InvoiceLineCreate(InvoiceLineBase):
    pass


class InvoiceLineUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, max_length=20)
    unit_price_ht: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    order: Optional[int] = Field(None, ge=0)


class InvoiceLineRead(BaseModel):
    id: int
    invoice_id: int
    description: str
    quantity: Decimal = Field(..., description="Quantité (peut être négative pour les avoirs)")
    unit: Optional[str] = Field(None, description="Unité de mesure")
    unit_price_ht: Decimal = Field(..., ge=0, description="Prix unitaire HT")
    tax_rate: Decimal = Field(..., ge=0, le=100, description="Taux de TVA en pourcentage")
    order: int = Field(..., ge=0, description="Ordre d'affichage")
    subtotal_ht: Decimal
    tax_amount: Decimal
    total_ttc: Decimal
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour Invoice
# ============================================================================

class InvoiceBase(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    quote_id: Optional[int] = None
    
    # Informations vendeur
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_siren: Optional[str] = Field(None, max_length=9, min_length=9)
    seller_siret: Optional[str] = Field(None, max_length=14, min_length=14)
    seller_vat_number: Optional[str] = None
    seller_rcs: Optional[str] = None
    seller_legal_form: Optional[str] = None
    seller_capital: Optional[Decimal] = None
    
    # Informations client
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_siren: Optional[str] = Field(None, max_length=9, min_length=9)
    client_delivery_address: Optional[str] = None
    
    # Dates
    issue_date: Optional[datetime] = None
    sale_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
    # Réduction/Escompte
    discount_type: Optional[str] = Field(None, description="Type de réduction: 'percentage' ou 'fixed'")
    discount_value: Optional[Decimal] = Field(None, ge=0, description="Valeur de la réduction (en % ou en €)")
    discount_label: Optional[str] = Field(None, description="Libellé de la réduction (ex: 'Remise commerciale', 'Escompte 2%')")
    
    # Conditions
    payment_terms: Optional[str] = None
    late_penalty_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    recovery_fee: Optional[Decimal] = Field(None, ge=0)
    
    # Mentions spéciales
    vat_on_debit: bool = False
    vat_exemption_reference: Optional[str] = None
    operation_category: Optional[str] = Field(None, pattern="^(vente|prestation|les deux)$")
    vat_applicable: bool = True
    
    # Notes
    notes: Optional[str] = None
    conditions: Optional[str] = None
    
    # Lignes de facture
    lines: List[InvoiceLineCreate] = Field(..., min_items=1)


class InvoiceCreate(InvoiceBase):
    invoice_type: Optional[str] = "facture"  # "facture" ou "avoir"
    original_invoice_id: Optional[int] = None  # Pour les avoirs
    credit_amount: Optional[Decimal] = None  # Pour les avoirs
    
    @validator('seller_siren', 'client_siren')
    def validate_siren(cls, v):
        if v and not v.isdigit():
            raise ValueError('SIREN doit contenir uniquement des chiffres')
        return v
    
    @validator('seller_siret')
    def validate_siret(cls, v):
        if v and not v.isdigit():
            raise ValueError('SIRET doit contenir uniquement des chiffres')
        return v


class InvoiceUpdate(BaseModel):
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    
    # Informations vendeur
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_siren: Optional[str] = Field(None, max_length=9, min_length=9)
    seller_siret: Optional[str] = Field(None, max_length=14, min_length=14)
    seller_vat_number: Optional[str] = None
    seller_rcs: Optional[str] = None
    seller_legal_form: Optional[str] = None
    seller_capital: Optional[Decimal] = None
    
    # Informations client
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_siren: Optional[str] = Field(None, max_length=9, min_length=9)
    client_delivery_address: Optional[str] = None
    
    # Dates
    issue_date: Optional[datetime] = None
    sale_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
    # Réduction/Escompte
    discount_type: Optional[str] = Field(None, description="Type de réduction: 'percentage' ou 'fixed'")
    discount_value: Optional[Decimal] = Field(None, ge=0, description="Valeur de la réduction (en % ou en €)")
    discount_label: Optional[str] = Field(None, description="Libellé de la réduction (ex: 'Remise commerciale', 'Escompte 2%')")
    
    # Conditions
    payment_terms: Optional[str] = None
    late_penalty_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    recovery_fee: Optional[Decimal] = Field(None, ge=0)
    
    # Mentions spéciales
    vat_on_debit: Optional[bool] = None
    vat_exemption_reference: Optional[str] = None
    operation_category: Optional[str] = Field(None, pattern="^(vente|prestation|les deux)$")
    vat_applicable: Optional[bool] = None
    
    # Notes
    notes: Optional[str] = None
    conditions: Optional[str] = None
    
    # Lignes de facture
    lines: Optional[List[InvoiceLineCreate]] = None


class InvoiceRead(BaseModel):
    id: int
    company_id: int
    client_id: int
    project_id: Optional[int]
    quote_id: Optional[int]
    number: str
    invoice_type: str
    original_invoice_id: Optional[int]
    credit_amount: Optional[Decimal]
    
    # Statut
    status: str
    amount: Decimal
    subtotal_ht: Optional[Decimal]
    total_tax: Optional[Decimal]
    total_ttc: Optional[Decimal]
    sent_at: Optional[datetime]
    paid_at: Optional[datetime]
    due_date: Optional[datetime]
    
    # Informations vendeur
    seller_name: Optional[str]
    seller_address: Optional[str]
    seller_siren: Optional[str]
    seller_siret: Optional[str]
    seller_vat_number: Optional[str]
    seller_rcs: Optional[str]
    seller_legal_form: Optional[str]
    seller_capital: Optional[Decimal]
    
    # Informations client
    client_name: Optional[str]
    client_address: Optional[str]
    client_siren: Optional[str]
    client_delivery_address: Optional[str]
    
    # Dates
    issue_date: Optional[datetime]
    sale_date: Optional[datetime]
    
    # Réduction/Escompte
    discount_type: Optional[str]
    discount_value: Optional[Decimal]
    discount_label: Optional[str]
    
    # Conditions
    payment_terms: Optional[str]
    late_penalty_rate: Optional[Decimal]
    recovery_fee: Optional[Decimal]
    
    # Mentions spéciales
    vat_on_debit: bool
    vat_exemption_reference: Optional[str]
    operation_category: Optional[str]
    vat_applicable: bool
    
    # Notes
    notes: Optional[str]
    conditions: Optional[str]
    
    # Archivage
    archived_at: Optional[datetime]
    archived_by_id: Optional[int]
    
    # Soft delete
    deleted_at: Optional[datetime]
    deleted_by_id: Optional[int]
    
    created_at: datetime
    updated_at: datetime
    
    # Relations
    lines: List[InvoiceLineRead] = []
    
    # Montants calculés (non stockés en DB, calculés depuis les paiements)
    amount_paid: Optional[Decimal] = None
    amount_remaining: Optional[Decimal] = None
    # Montant restant créditable (total - avoirs déjà créés)
    credit_remaining: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour InvoicePayment
# ============================================================================

class InvoicePaymentRead(BaseModel):
    id: int
    invoice_id: int
    amount: Decimal
    payment_date: datetime
    payment_method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour CreditNote (Avoir)
# ============================================================================

class CreditNoteCreate(BaseModel):
    original_invoice_id: int
    credit_amount: Decimal = Field(..., gt=0, description="Montant de l'avoir")
    reason: Optional[str] = None
    lines: List[InvoiceLineCreate] = Field(..., min_items=1)
    
    # On peut reprendre certaines informations de la facture originale
    notes: Optional[str] = None
    conditions: Optional[str] = None


# ============================================================================
# Schémas pour AuditLog
# ============================================================================

class InvoiceAuditLogRead(BaseModel):
    id: int
    invoice_id: int
    user_id: int
    action: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    description: Optional[str]
    timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    
    # Relations
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Schémas pour les documents liés
# ============================================================================

class RelatedDocument(BaseModel):
    type: str = Field(..., description="Type de document: 'quote', 'credit_note', ou 'invoice'")
    id: int = Field(..., description="ID du document")
    number: str = Field(..., description="Numéro du document")
    status: str = Field(..., description="Statut du document")
    total: Optional[float] = Field(None, description="Montant total")
    credit_amount: Optional[float] = Field(None, description="Montant crédité (pour les avoirs)")
    created_at: Optional[str] = Field(None, description="Date de création (ISO format)")


class RelatedDocumentsResponse(BaseModel):
    invoice_id: int
    related_documents: List[RelatedDocument]
