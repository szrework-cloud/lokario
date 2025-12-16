from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class InvoiceAuditLog(Base):
    __tablename__ = "invoice_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # 'created', 'updated', 'status_changed', 'deleted', 'archived', etc.
    field_name = Column(String(100), nullable=True)  # Champ modifié
    old_value = Column(Text, nullable=True)  # Ancienne valeur (JSON string)
    new_value = Column(Text, nullable=True)  # Nouvelle valeur (JSON string)
    description = Column(Text, nullable=True)  # Description lisible de l'action
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)  # User agent du navigateur
    
    # Relations
    invoice = relationship("Invoice", backref="audit_logs")
    user = relationship("User")
