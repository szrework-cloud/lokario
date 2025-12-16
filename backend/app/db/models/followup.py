from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class FollowUpType(str, enum.Enum):
    DEVIS_NON_REPONDU = "Devis non répondu"
    FACTURE_IMPAYEE = "Facture impayée"
    INFO_MANQUANTE = "Info manquante"
    RAPPEL_RDV = "Rappel RDV"
    CLIENT_INACTIF = "Client inactif"
    PROJET_EN_ATTENTE = "Projet en attente"


class FollowUpStatus(str, enum.Enum):
    A_FAIRE = "À faire"
    FAIT = "Fait"
    EN_ATTENTE = "En attente"


class FollowUpHistoryStatus(str, enum.Enum):
    ENVOYE = "envoyé"
    LU = "lu"
    REPONDU = "répondu"


class FollowUp(Base):
    __tablename__ = "followups"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Type de relance
    type = Column(SQLEnum(FollowUpType), nullable=False, index=True)
    
    # Source de la relance
    source_type = Column(String, nullable=False)  # "quote", "invoice", "appointment", "project", "conversation", "manual"
    source_id = Column(Integer, nullable=True)  # ID de la source
    source_label = Column(String, nullable=False)  # Ex: "Devis #2025-023"
    
    # Dates
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    actual_date = Column(DateTime(timezone=True), nullable=True)  # Date réelle pour calculs
    
    # Statut
    status = Column(SQLEnum(FollowUpStatus), nullable=False, default=FollowUpStatus.A_FAIRE, index=True)
    
    # Montant (si applicable)
    amount = Column(Numeric(10, 2), nullable=True)
    
    # Automatisation
    auto_enabled = Column(Boolean, default=False, nullable=False)
    auto_frequency_days = Column(Integer, nullable=True)
    auto_stop_on_response = Column(Boolean, default=True, nullable=False)
    auto_stop_on_paid = Column(Boolean, default=True, nullable=False)
    auto_stop_on_refused = Column(Boolean, default=True, nullable=False)
    
    # Métadonnées
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="followups")
    client = relationship("Client", backref="followups")
    created_by = relationship("User", foreign_keys=[created_by_id])
    history = relationship("FollowUpHistory", back_populates="followup", cascade="all, delete-orphan")


class FollowUpHistory(Base):
    __tablename__ = "followup_history"
    
    id = Column(Integer, primary_key=True, index=True)
    followup_id = Column(Integer, ForeignKey("followups.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Message envoyé
    message = Column(Text, nullable=False)
    message_type = Column(String, nullable=False)  # "email", "whatsapp", "sms", "call"
    
    # Statut
    status = Column(SQLEnum(FollowUpHistoryStatus), nullable=False, default=FollowUpHistoryStatus.ENVOYE)
    
    # Qui a envoyé
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sent_by_name = Column(String, nullable=True)  # Nom de la personne
    
    # Date
    sent_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Lien vers conversation (si envoyé via inbox)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    followup = relationship("FollowUp", back_populates="history")
    company = relationship("Company", backref="followup_history")
    sent_by = relationship("User", foreign_keys=[sent_by_id])
    conversation = relationship("Conversation", backref="followup_history")
