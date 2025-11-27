from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum, Text
from decimal import Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class QuoteStatus(str, enum.Enum):
    ENVOYE = "envoyé"
    VU = "vu"
    ACCEPTE = "accepté"
    REFUSE = "refusé"


class InvoiceStatus(str, enum.Enum):
    ENVOYEE = "envoyée"
    PAYEE = "payée"
    IMPAYEE = "impayée"
    EN_RETARD = "en retard"


class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    number = Column(String, nullable=False, unique=True, index=True)  # "DEV-2025-023"
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(QuoteStatus), nullable=False, default=QuoteStatus.ENVOYE)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    refused_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="quotes")
    client = relationship("Client", back_populates="quotes")
    project = relationship("Project", back_populates="quotes")


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)
    number = Column(String, nullable=False, unique=True, index=True)  # "FAC-2025-014"
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.ENVOYEE)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="invoices")
    client = relationship("Client", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    quote = relationship("Quote", backref="invoices")

