from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    sector = Column(String, nullable=True)  # commerce, beauté, resto, services, etc.
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    type = Column(String, nullable=True, default="Client")  # "Client" ou "Fournisseur"
    tags = Column(JSON, nullable=True)  # Liste de tags : ["VIP", "régulier", "nouveau"]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="clients")
    projects = relationship("Project", back_populates="client")
    quotes = relationship("Quote", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")

