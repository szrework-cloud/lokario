"""
Modèles pour les intégrations Inbox (IMAP, API externes)
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class InboxIntegration(Base):
    """
    Configuration d'intégration pour recevoir les messages (IMAP, API, etc.)
    Une entreprise peut avoir plusieurs intégrations (plusieurs boîtes mail).
    """
    __tablename__ = "inbox_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Type d'intégration
    integration_type = Column(String, nullable=False)  # "imap", "sendgrid", "mailgun", "whatsapp", "messenger"
    
    # Nom de l'intégration (pour l'identifier)
    name = Column(String, nullable=False)  # ex: "Boîte principale", "Support client", etc.
    
    # Configuration IMAP (si type = "imap")
    imap_server = Column(String, nullable=True)  # imap.gmail.com, imap.orange.fr, etc.
    imap_port = Column(Integer, nullable=True)  # 993, 143, etc.
    email_address = Column(String, nullable=True)  # L'adresse email
    email_password = Column(Text, nullable=True)  # Mot de passe ou app password (chiffré en production)
    use_ssl = Column(Boolean, default=True, nullable=False)
    
    # Configuration API (si type = "sendgrid", "mailgun", etc.)
    api_key = Column(Text, nullable=True)  # Clé API (chiffrée en production)
    webhook_url = Column(String, nullable=True)  # URL du webhook configuré chez le fournisseur
    webhook_secret = Column(String, nullable=True)  # Secret pour vérifier les webhooks
    
    # Configuration WhatsApp/Messenger
    account_id = Column(String, nullable=True)  # ID du compte WhatsApp/Messenger
    phone_number = Column(String, nullable=True)  # Numéro de téléphone WhatsApp
    
    # Statut
    is_active = Column(Boolean, default=True, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)  # Boîte mail principale pour l'envoi
    last_sync_at = Column(DateTime(timezone=True), nullable=True)  # Dernière synchronisation
    last_sync_status = Column(String, nullable=True)  # "success", "error", etc.
    last_sync_error = Column(Text, nullable=True)  # Message d'erreur si échec
    
    # Métadonnées
    sync_interval_minutes = Column(Integer, default=5, nullable=False)  # Intervalle de synchronisation (minutes)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="inbox_integrations")

