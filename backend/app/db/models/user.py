from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False)  # super_admin, owner, user
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)  # nullable pour super_admin
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)  # Email vérifié ou non
    email_verification_token = Column(String, unique=True, nullable=True, index=True)  # Token de vérification
    email_verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)  # Expiration du token
    password_reset_token = Column(String, unique=True, nullable=True, index=True)  # Token pour réinitialisation mot de passe
    password_reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)  # Expiration du token de réinitialisation
    deletion_requested_at = Column(DateTime(timezone=True), nullable=True)  # Date de demande de suppression
    deletion_scheduled_at = Column(DateTime(timezone=True), nullable=True)  # Date prévue de suppression définitive (30 jours après demande)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Permissions pour les tâches (pour les users uniquement, les owners/admins ont tous les droits)
    can_edit_tasks = Column(Boolean, default=False, nullable=False)
    can_delete_tasks = Column(Boolean, default=False, nullable=False)
    can_create_tasks = Column(Boolean, default=False, nullable=False)
    
    # Relations
    company = relationship("Company", back_populates="users")

