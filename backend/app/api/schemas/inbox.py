from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any


# ===== FOLDERS =====

class FolderBase(BaseModel):
    name: str
    color: Optional[str] = None
    folder_type: str = "general"  # general, info, rdv, facture, support, autre
    is_system: bool = False
    ai_rules: Optional[Dict[str, Any]] = None
    auto_reply: Optional[Dict[str, Any]] = None


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    folder_type: Optional[str] = None
    ai_rules: Optional[Dict[str, Any]] = None
    auto_reply: Optional[Dict[str, Any]] = None


class FolderRead(FolderBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ===== ATTACHMENTS =====

class AttachmentBase(BaseModel):
    name: str
    file_type: str  # image, pdf, document, other
    file_path: str
    file_size: int
    mime_type: Optional[str] = None


class AttachmentRead(AttachmentBase):
    id: int
    message_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===== MESSAGES =====

class MessageBase(BaseModel):
    from_name: str
    from_email: Optional[EmailStr] = None
    from_phone: Optional[str] = None
    content: str
    source: str  # email, whatsapp, messenger, formulaire
    is_from_client: bool = True
    external_id: Optional[str] = None
    external_metadata: Optional[Dict[str, Any]] = None


class MessageCreate(MessageBase):
    conversation_id: int
    attachments: Optional[List[Dict[str, Any]]] = None  # Pour créer les attachments en même temps


class MessageRead(MessageBase):
    id: int
    conversation_id: int
    read: bool
    created_at: datetime
    attachments: List[AttachmentRead] = []
    
    class Config:
        from_attributes = True


# ===== INTERNAL NOTES =====

class InternalNoteBase(BaseModel):
    content: str


class InternalNoteCreate(InternalNoteBase):
    conversation_id: int


class InternalNoteRead(InternalNoteBase):
    id: int
    conversation_id: int
    author_id: int
    author_name: Optional[str] = None  # Sera enrichi depuis User
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===== CONVERSATIONS =====

class ConversationBase(BaseModel):
    subject: Optional[str] = None
    status: str = "À répondre"
    source: str  # email, whatsapp, messenger, formulaire
    client_id: Optional[int] = None
    folder_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    is_urgent: bool = False


class ConversationCreate(ConversationBase):
    # Premier message de la conversation
    first_message: MessageBase


class ConversationUpdate(BaseModel):
    subject: Optional[str] = None
    status: Optional[str] = None
    client_id: Optional[int] = None
    folder_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    is_urgent: Optional[bool] = None


class ConversationRead(ConversationBase):
    id: int
    company_id: int
    ai_classified: bool
    classification_confidence: Optional[int] = None
    auto_reply_sent: bool
    auto_reply_pending: bool
    auto_reply_mode: Optional[str] = None
    unread_count: int
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Relations enrichies
    client_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    folder_name: Optional[str] = None
    client_email: Optional[str] = None  # Email du premier message du client
    client_phone: Optional[str] = None  # Téléphone du premier message du client
    
    class Config:
        from_attributes = True


class ConversationDetail(ConversationRead):
    """Conversation avec tous ses messages et notes"""
    messages: List[MessageRead] = []
    internal_notes: List[InternalNoteRead] = []
    pending_reply_content: Optional[str] = None

