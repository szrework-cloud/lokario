from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class ChatbotMessageBase(BaseModel):
    content: str
    role: str  # "user" ou "assistant"


class ChatbotMessageCreate(BaseModel):
    content: str


class ChatbotMessageRead(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    context_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()  # Désactive la protection des namespaces pour permettre "model_used"
    }


class ChatbotConversationBase(BaseModel):
    title: Optional[str] = None
    status: str = "active"


class ChatbotConversationCreate(BaseModel):
    title: Optional[str] = None


class ChatbotConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


class ChatbotConversationRead(BaseModel):
    id: int
    company_id: int
    user_id: int
    title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    messages: List[ChatbotMessageRead] = []
    
    class Config:
        from_attributes = True


class ChatbotSendMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None  # Si None, crée une nouvelle conversation
    model: Optional[str] = "gpt-4o-mini"  # Modèle plus économique par défaut
    max_tokens: Optional[int] = 1000  # Augmenté pour permettre des réponses plus détaillées
    temperature: Optional[float] = 0.5  # Réduit pour des réponses plus précises


class ChatbotSendMessageResponse(BaseModel):
    conversation_id: int
    message: ChatbotMessageRead
    response: ChatbotMessageRead

