from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ChatbotConversation(Base):
    __tablename__ = "chatbot_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False)  # active, archived, deleted
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    company = relationship("Company", backref="chatbot_conversations")
    user = relationship("User", backref="chatbot_conversations")
    messages = relationship("ChatbotMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatbotMessage.created_at")


class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chatbot_conversations.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)  # Nombre de tokens utilisés
    model_used = Column(String, nullable=True)  # Modèle ChatGPT utilisé (ex: "gpt-4", "gpt-3.5-turbo")
    context_snapshot = Column(JSON, nullable=True)  # Snapshot du contexte utilisé pour cette réponse
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    
    # Relations
    conversation = relationship("ChatbotConversation", back_populates="messages")


class ChatbotContextCache(Base):
    __tablename__ = "chatbot_context_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True, index=True)
    context_data = Column(JSON, nullable=False)  # Contexte complet de l'entreprise
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Cache expire après X minutes
    
    # Relations
    company = relationship("Company", backref="chatbot_context_cache")

