from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # Code à 6 chiffres unique
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=True, index=True)  # Slug pour les URLs publiques (ex: "s-rework")
    sector = Column(String, nullable=True)  # commerce / beauté / resto, etc.
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Gestion TVA et auto-entrepreneurs (l'entreprise qui crée les factures)
    is_auto_entrepreneur = Column(Boolean, default=False, nullable=False)
    vat_exempt = Column(Boolean, default=False, nullable=False)  # Exonération TVA
    vat_exemption_reference = Column(String(100), nullable=True)  # Article CGI (ex: "Art. 293 B du CGI")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    users = relationship("User", back_populates="company")
    settings = relationship("CompanySettings", back_populates="company", uselist=False)
    subscription = relationship("Subscription", back_populates="company", uselist=False)

