from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from app.db.models.followup import FollowUpType, FollowUpStatus, FollowUpHistoryStatus


# ==================== FOLLOWUP SCHEMAS ====================

class FollowUpBase(BaseModel):
    type: FollowUpType
    client_id: int
    source_type: str  # "quote", "invoice", "appointment", "project", "conversation", "manual"
    source_id: Optional[int] = None
    source_label: str
    due_date: datetime
    actual_date: Optional[datetime] = None  # Date réelle pour calculs
    status: FollowUpStatus = FollowUpStatus.A_FAIRE
    amount: Optional[Decimal] = None
    auto_enabled: bool = False
    auto_frequency_days: Optional[int] = None
    auto_stop_on_response: bool = True
    auto_stop_on_paid: bool = True
    auto_stop_on_refused: bool = True


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    status: Optional[FollowUpStatus] = None
    due_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    auto_enabled: Optional[bool] = None
    auto_frequency_days: Optional[int] = None
    auto_stop_on_response: Optional[bool] = None
    auto_stop_on_paid: Optional[bool] = None
    auto_stop_on_refused: Optional[bool] = None


class FollowUpRead(FollowUpBase):
    id: int
    company_id: int
    client_name: str
    created_at: datetime
    updated_at: datetime
    # Informations sur les relances envoyées
    total_sent: Optional[int] = 0  # Nombre de relances déjà envoyées
    remaining_relances: Optional[int] = None  # Nombre de relances restantes (pour automatiques)
    next_relance_number: Optional[int] = None  # Numéro de la prochaine relance (1, 2, 3...)
    has_been_sent: Optional[bool] = False  # Si au moins une relance a été envoyée
    
    class Config:
        from_attributes = True


# ==================== FOLLOWUP HISTORY SCHEMAS ====================

class FollowUpHistoryBase(BaseModel):
    message: str
    message_type: str  # "email", "whatsapp", "sms", "call"
    status: FollowUpHistoryStatus = FollowUpHistoryStatus.ENVOYE
    sent_by_name: Optional[str] = None


class FollowUpHistoryCreate(FollowUpHistoryBase):
    followup_id: int
    sent_at: datetime
    conversation_id: Optional[int] = None


class FollowUpHistoryRead(FollowUpHistoryBase):
    id: int
    followup_id: int
    sent_at: datetime
    sent_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== STATS SCHEMAS ====================

class FollowUpStats(BaseModel):
    total: int
    invoices: int
    quotes: int
    late: int
    total_amount: float


# ==================== WEEKLY DATA SCHEMAS ====================

class WeeklyFollowUpData(BaseModel):
    day: str
    count: int


# ==================== SETTINGS SCHEMAS ====================

class FollowUpMessageTemplate(BaseModel):
    id: int
    type: str  # "devis", "facture", "info", "rdv", "general"
    content: str
    method: Optional[str] = "email"  # "email" ou "sms" - méthode d'envoi par défaut pour ce template


class FollowUpStopConditions(BaseModel):
    stop_on_client_response: bool = True
    stop_on_invoice_paid: bool = True
    stop_on_quote_refused: bool = True


class FollowUpSettings(BaseModel):
    initial_delay_days: int = 7
    max_relances: int = 3
    relance_delays: List[int] = Field(default=[7, 14, 21])
    relance_methods: List[str] = Field(default=["email", "email", "whatsapp"])
    stop_conditions: FollowUpStopConditions = Field(default_factory=FollowUpStopConditions)
    messages: List[FollowUpMessageTemplate] = Field(default_factory=list)
    # Relances avant la date d'échéance
    enable_relances_before: bool = False  # Activer les relances avant la due_date
    days_before_due: Optional[int] = None  # Nombre de jours avant la due_date (ex: 1 = 1 jour avant)
    hours_before_due: Optional[int] = None  # Nombre d'heures avant la due_date (ex: 4 = 4 heures avant)


class FollowUpSettingsUpdate(BaseModel):
    initial_delay_days: Optional[int] = None
    max_relances: Optional[int] = None
    relance_delays: Optional[List[int]] = None
    relance_methods: Optional[List[str]] = None
    stop_conditions: Optional[FollowUpStopConditions] = None
    messages: Optional[List[FollowUpMessageTemplate]] = None
    enable_relances_before: Optional[bool] = None
    days_before_due: Optional[int] = None
    hours_before_due: Optional[int] = None


# ==================== GENERATE MESSAGE SCHEMAS ====================

class GenerateMessageRequest(BaseModel):
    context: Optional[str] = None


class GenerateMessageResponse(BaseModel):
    message: str
