from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class NotificationType(str, enum.Enum):
    FOLLOWUP_COMPLETED = "followup_completed"  # Relance validée
    QUOTE_SIGNED = "quote_signed"  # Devis signé
    INVOICE_PAID = "invoice_paid"  # Facture payée
    FOLLOWUP_FAILED = "followup_failed"  # Relance échouée
    QUOTE_REJECTED = "quote_rejected"  # Devis refusé
    INVOICE_OVERDUE = "invoice_overdue"  # Facture en retard
    TASK_OVERDUE = "task_overdue"  # Tâche en retard
    TASK_CRITICAL = "task_critical"  # Tâche critique à venir
    APPOINTMENT_REMINDER = "appointment_reminder"  # Rappel de rendez-vous
    APPOINTMENT_CANCELLED = "appointment_cancelled"  # Rendez-vous annulé
    APPOINTMENT_MODIFIED = "appointment_modified"  # Rendez-vous modifié
    APPOINTMENT_CREATED = "appointment_created"  # Nouveau rendez-vous créé


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Si null, notification pour toute l'entreprise
    
    # Type de notification
    type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    
    # Titre et message
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Lien vers l'élément concerné (optionnel)
    link_url = Column(String, nullable=True)  # Ex: "/app/billing/quotes/123"
    link_text = Column(String, nullable=True)  # Ex: "Voir le devis"
    
    # Métadonnées sur l'élément source
    source_type = Column(String, nullable=True)  # "quote", "invoice", "followup"
    source_id = Column(Integer, nullable=True)  # ID de l'élément source
    
    # Statut
    read = Column(Boolean, default=False, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    company = relationship("Company", backref="notifications")
    user = relationship("User", foreign_keys=[user_id])

