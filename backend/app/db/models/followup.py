from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class FollowUpType(str, enum.Enum):
    DEVIS_NON_LU = "Devis non répondu"
    DEVIS_NON_ACCEPTE = "Devis non accepté"
    FACTURE_IMPAYEE = "Facture impayée"
    RAPPEL_RDV = "Rappel RDV"
    INFO_MANQUANTE = "Info manquante"


class FollowUpStatus(str, enum.Enum):
    A_FAIRE = "À faire"
    EN_ATTENTE = "En attente"
    FAIT = "Fait"


class FollowUp(Base):
    __tablename__ = "followups"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    type = Column(Enum(FollowUpType), nullable=False)
    status = Column(Enum(FollowUpStatus), nullable=False, default=FollowUpStatus.A_FAIRE)
    due_date = Column(DateTime(timezone=True), nullable=True)
    amount = Column(Numeric(10, 2), nullable=True)
    message = Column(Text, nullable=True)
    is_automatic = Column(Boolean, default=False, nullable=False)  # Relance automatique ou manuelle
    delay_days = Column(Integer, nullable=True)  # J+3, J+7, J+14 pour les factures
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="followups")
    client = relationship("Client", backref="followups")
    project = relationship("Project", backref="followups")


class FollowUpTemplate(Base):
    __tablename__ = "followup_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    sector = Column(String, nullable=True)  # "coiffure", "resto", "commerce", etc.
    followup_type = Column(Enum(FollowUpType), nullable=False)
    message_template = Column(Text, nullable=False)
    delay_days = Column(Integer, nullable=True)  # J+3, J+7, J+14
    frequency = Column(String, nullable=True)  # "Une fois", "Hebdomadaire", etc.
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="followup_templates")

