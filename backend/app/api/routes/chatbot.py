from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.db.session import get_db
from app.db.models.chatbot import ChatbotConversation, ChatbotMessage
from app.api.schemas.chatbot import (
    ChatbotConversationRead,
    ChatbotConversationCreate,
    ChatbotConversationUpdate,
    ChatbotMessageRead,
    ChatbotSendMessageRequest,
    ChatbotSendMessageResponse,
)
from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.core.chatbot_service import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.get("/conversations", response_model=List[ChatbotConversationRead])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status_filter: str = "active"
):
    """
    Récupère toutes les conversations du chatbot pour l'utilisateur courant.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    query = db.query(ChatbotConversation).filter(
        ChatbotConversation.company_id == current_user.company_id,
        ChatbotConversation.user_id == current_user.id
    )
    
    if status_filter:
        query = query.filter(ChatbotConversation.status == status_filter)
    
    conversations = query.order_by(ChatbotConversation.last_message_at.desc()).all()
    
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ChatbotConversationRead)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère une conversation spécifique avec tous ses messages.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    conversation = db.query(ChatbotConversation).filter(
        ChatbotConversation.id == conversation_id,
        ChatbotConversation.company_id == current_user.company_id,
        ChatbotConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.post("/conversations", response_model=ChatbotConversationRead)
def create_conversation(
    conversation_data: ChatbotConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée une nouvelle conversation.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    conversation = ChatbotConversation(
        company_id=current_user.company_id,
        user_id=current_user.id,
        title=conversation_data.title,
        status="active"
    )
    
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return conversation


@router.patch("/conversations/{conversation_id}", response_model=ChatbotConversationRead)
def update_conversation(
    conversation_id: int,
    conversation_data: ChatbotConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour une conversation (titre, statut).
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    conversation = db.query(ChatbotConversation).filter(
        ChatbotConversation.id == conversation_id,
        ChatbotConversation.company_id == current_user.company_id,
        ChatbotConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    update_data = conversation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(conversation, field, value)
    
    db.commit()
    db.refresh(conversation)
    
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime une conversation (soft delete en changeant le statut).
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    conversation = db.query(ChatbotConversation).filter(
        ChatbotConversation.id == conversation_id,
        ChatbotConversation.company_id == current_user.company_id,
        ChatbotConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.status = "deleted"
    db.commit()
    
    return None


@router.post("/send-message", response_model=ChatbotSendMessageResponse)
async def send_message(
    request: ChatbotSendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envoie un message au chatbot et reçoit une réponse de ChatGPT.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    if not chatbot_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="Chatbot service is not available. Please configure OPENAI_API_KEY."
        )
    
    # Récupérer ou créer la conversation
    if request.conversation_id:
        conversation = db.query(ChatbotConversation).filter(
            ChatbotConversation.id == request.conversation_id,
            ChatbotConversation.company_id == current_user.company_id,
            ChatbotConversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Créer une nouvelle conversation
        conversation = ChatbotConversation(
            company_id=current_user.company_id,
            user_id=current_user.id,
            title=None,  # Peut être généré automatiquement plus tard
            status="active"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Sauvegarder le message de l'utilisateur
    user_message = ChatbotMessage(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Générer la réponse avec ChatGPT
    try:
        response_data = await chatbot_service.generate_response(
            db=db,
            conversation_id=conversation.id,
            user_message=request.message,
            company_id=current_user.company_id,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de la génération de la réponse: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération de la réponse: {str(e)}"
        )
    
    if not response_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate response from ChatGPT. Check server logs for details."
        )
    
    # Vérifier si c'est une erreur de quota
    if response_data.get("error") == "quota_exceeded":
        # Sauvegarder le message d'erreur comme réponse
        assistant_message = ChatbotMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=response_data.get("response", "Erreur de quota OpenAI"),
            tokens_used=None,
            model_used=None,
            context_snapshot=None
        )
    else:
        # Sauvegarder la réponse normale de l'assistant
        assistant_message = ChatbotMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=response_data["response"],
            tokens_used=response_data.get("tokens_used"),
            model_used=response_data.get("model_used"),
            context_snapshot=response_data.get("context_snapshot")
        )
    db.add(assistant_message)
    
    # Mettre à jour la date du dernier message
    conversation.last_message_at = datetime.now()
    
    db.commit()
    db.refresh(assistant_message)
    
    return ChatbotSendMessageResponse(
        conversation_id=conversation.id,
        message=user_message,
        response=assistant_message
    )

