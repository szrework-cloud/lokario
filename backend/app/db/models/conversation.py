from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)  # Peut être null si client non identifié
    
    # Informations de la conversation
    subject = Column(String, nullable=True)  # Sujet (pour email)
    status = Column(String, nullable=False, default="À répondre")  # À répondre, En attente, Répondu, Résolu, Urgent, Archivé, Spam
    source = Column(String, nullable=False)  # email, whatsapp, messenger, formulaire
    folder_id = Column(Integer, ForeignKey("inbox_folders.id"), nullable=True, index=True)
    
    # Assignation
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Classification IA
    ai_classified = Column(Boolean, default=False, nullable=False)
    classification_confidence = Column(Integer, nullable=True)  # 0-100
    
    # Réponse automatique
    auto_reply_sent = Column(Boolean, default=False, nullable=False)
    auto_reply_pending = Column(Boolean, default=False, nullable=False)
    auto_reply_mode = Column(String, nullable=True)  # none, approval, auto
    pending_auto_reply_content = Column(Text, nullable=True)  # Contenu de la réponse en attente
    
    # Métadonnées
    is_urgent = Column(Boolean, default=False, nullable=False)
    unread_count = Column(Integer, default=0, nullable=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="conversations")
    client = relationship("Client", backref="conversations")
    folder = relationship("InboxFolder", back_populates="conversations")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    messages = relationship("InboxMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="InboxMessage.created_at")
    internal_notes = relationship("InternalNote", back_populates="conversation", cascade="all, delete-orphan")


class InboxMessage(Base):
    __tablename__ = "inbox_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    
    # Contenu
    from_name = Column(String, nullable=False)  # Nom de l'expéditeur
    from_email = Column(String, nullable=True)  # Email (si source email)
    from_phone = Column(String, nullable=True)  # Téléphone (si source WhatsApp)
    content = Column(Text, nullable=False)
    source = Column(String, nullable=False)  # email, whatsapp, messenger, formulaire
    
    # Métadonnées
    is_from_client = Column(Boolean, default=True, nullable=False)  # True si message du client, False si réponse de l'entreprise
    read = Column(Boolean, default=False, nullable=False)
    
    # Métadonnées externes (pour intégrations)
    external_id = Column(String, nullable=True, index=True)  # ID du message dans le système externe (Gmail, WhatsApp, etc.)
    external_metadata = Column(JSON, nullable=True)  # Métadonnées supplémentaires (headers email, etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    conversation = relationship("Conversation", back_populates="messages")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("inbox_messages.id"), nullable=False, index=True)
    
    # Informations du fichier
    name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # image, pdf, document, other
    file_path = Column(String, nullable=False)  # Chemin de stockage
    file_size = Column(Integer, nullable=False)  # Taille en bytes
    mime_type = Column(String, nullable=True)  # MIME type (image/jpeg, application/pdf, etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    message = relationship("InboxMessage", back_populates="attachments")


class InboxFolder(Base):
    __tablename__ = "inbox_folders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Informations du dossier
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)  # Code couleur hex
    folder_type = Column(String, nullable=False, default="general")  # general, info, rdv, facture, support, autre
    is_system = Column(Boolean, default=False, nullable=False)  # True pour Inbox, Archivé, Spam
    
    # Classification IA
    ai_rules = Column(JSON, nullable=True)  # {keywords: [], context: "", autoClassify: bool}
    
    # Réponse automatique
    auto_reply = Column(JSON, nullable=True)  # {enabled: bool, template: str, aiGenerate: bool, mode: str, delay: int, useCompanyKnowledge: bool}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="inbox_folders")
    conversations = relationship("Conversation", back_populates="folder")


class InternalNote(Base):
    __tablename__ = "internal_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Contenu
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    conversation = relationship("Conversation", back_populates="internal_notes")
    author = relationship("User", foreign_keys=[author_id])

