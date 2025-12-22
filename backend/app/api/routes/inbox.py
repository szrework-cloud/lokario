from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
import os
import shutil
import uuid
import logging
from pathlib import Path
from app.db.session import get_db
from app.db.models.conversation import (
    Conversation,
    InboxMessage,
    MessageAttachment,
    InboxFolder,
    InternalNote,
)
from app.db.models.client import Client
from app.db.models.user import User
from app.db.models.inbox_integration import InboxIntegration
from app.db.models.company_settings import CompanySettings
from app.core.imap_service import delete_email_imap_async
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.conversation_classifier import auto_classify_conversation_status
from app.core.vonage_service import VonageSMSService
from app.core.ai_reply_service import ai_reply_service
from app.api.schemas.inbox import (
    ConversationCreate,
    ConversationUpdate,
    ConversationRead,
    ConversationDetail,
    MessageCreate,
    MessageRead,
    InternalNoteCreate,
    InternalNoteRead,
    FolderCreate,
    FolderUpdate,
    FolderRead,
    AttachmentRead,
)
from app.api.deps import get_current_active_user
from app.core.config import settings

router = APIRouter(prefix="/inbox", tags=["inbox"])
logger = logging.getLogger(__name__)

# Rate limiter (sera initialisé dans main.py)
limiter = None  # type: ignore

# Créer le répertoire d'upload s'il n'existe pas
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_file_type(filename: str) -> str:
    """Détermine le type de fichier basé sur l'extension."""
    ext = Path(filename).suffix.lower()
    if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        return "image"
    elif ext == ".pdf":
        return "pdf"
    elif ext in [".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"]:
        return "document"
    else:
        return "other"


# ===== CONVERSATIONS =====

@router.get("/conversations", response_model=List[ConversationRead])
def get_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),  # Limite augmentée à 1000 par défaut (max 10000)
    folder_id: Optional[int] = Query(None, description="Filtrer par dossier"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    source: Optional[str] = Query(None, description="Filtrer par source"),
    search: Optional[str] = Query(None, description="Recherche dans sujet et messages"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère la liste des conversations de l'entreprise de l'utilisateur.
    Chaque entreprise voit uniquement ses propres conversations.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Base query : filtrer par company_id
    query = db.query(Conversation).filter(Conversation.company_id == current_user.company_id)
    
    # Filtres optionnels
    if folder_id:
        query = query.filter(Conversation.folder_id == folder_id)
    # Si folder_id n'est pas spécifié, on affiche uniquement les conversations sans dossier (inbox principal)
    # Pour cela, on ne fait rien, car par défaut on veut toutes les conversations
    # Mais si folder_id est explicitement None, on filtre pour folder_id IS NULL
    # Note: Si folder_id est None (non fourni), on retourne toutes les conversations (avec ou sans dossier)
    # C'est le frontend qui filtre ensuite selon activeFolderId
    
    if status:
        query = query.filter(Conversation.status == status)
    
    if source:
        query = query.filter(Conversation.source == source)
    
    # Recherche dans sujet et messages
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Conversation.subject.ilike(search_term),
                Conversation.id.in_(
                    db.query(InboxMessage.conversation_id).filter(
                        InboxMessage.content.ilike(search_term)
                    )
                )
            )
        )
    
    # Charger les relations nécessaires en une seule requête (eager loading)
    from sqlalchemy.orm import joinedload
    query = query.options(
        joinedload(Conversation.client),
        joinedload(Conversation.assigned_to),
        joinedload(Conversation.folder)
    )
    
    # Trier par dernière activité
    conversations = query.order_by(
        Conversation.last_message_at.desc().nullslast(),
        Conversation.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Récupérer tous les premiers messages clients en une seule requête (optimisation N+1)
    conversation_ids = [conv.id for conv in conversations]
    first_client_messages = {}
    if conversation_ids:
        # Requête optimisée : récupérer le premier message client pour chaque conversation
        from sqlalchemy import func
        from sqlalchemy.orm import aliased
        
        # Sous-requête pour trouver la date minimale pour chaque conversation
        min_dates = (
            db.query(
                InboxMessage.conversation_id,
                func.min(InboxMessage.created_at).label('min_date')
            )
            .filter(
                InboxMessage.conversation_id.in_(conversation_ids),
                InboxMessage.is_from_client == True
            )
            .group_by(InboxMessage.conversation_id)
            .subquery()
        )
        
        # Récupérer les messages correspondants
        messages = db.query(InboxMessage).join(
            min_dates,
            and_(
                InboxMessage.conversation_id == min_dates.c.conversation_id,
                InboxMessage.created_at == min_dates.c.min_date,
                InboxMessage.is_from_client == True
            )
        ).all()
        
        for msg in messages:
            if msg.conversation_id not in first_client_messages:
                first_client_messages[msg.conversation_id] = msg
    
    # Enrichir avec les noms et récupérer email/téléphone du premier message du client
    result = []
    for conv in conversations:
        first_client_message = first_client_messages.get(conv.id)
        
        conv_dict = {
            "id": conv.id,
            "company_id": conv.company_id,
            "subject": conv.subject,
            "status": conv.status,
            "source": conv.source,
            "client_id": conv.client_id,
            "folder_id": conv.folder_id,
            "assigned_to_id": conv.assigned_to_id,
            "is_urgent": conv.is_urgent,
            "ai_classified": conv.ai_classified,
            "classification_confidence": conv.classification_confidence,
            "auto_reply_sent": conv.auto_reply_sent,
            "auto_reply_pending": conv.auto_reply_pending,
            "auto_reply_mode": conv.auto_reply_mode,
            "unread_count": conv.unread_count,
            "last_message_at": conv.last_message_at,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "client_name": (
                conv.client.name if conv.client 
                else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
            ),
            "assigned_to_name": conv.assigned_to.full_name if conv.assigned_to else None,
            "folder_name": conv.folder.name if conv.folder else None,
            "client_email": first_client_message.from_email if first_client_message else None,
            "client_phone": first_client_message.from_phone if first_client_message else None,
        }
        result.append(ConversationRead(**conv_dict))
    
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère une conversation spécifique avec tous ses messages et notes.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Charger la conversation avec tous les messages (eager loading)
    conversation = db.query(Conversation).options(
        joinedload(Conversation.messages).joinedload(InboxMessage.attachments)
    ).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Marquer les messages comme lus
    db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation_id,
        InboxMessage.is_from_client == True,
        InboxMessage.read == False
    ).update({"read": True})
    
    # Mettre à jour le compteur de non lus
    conversation.unread_count = 0
    db.commit()
    
    # Recharger la conversation pour s'assurer d'avoir les derniers messages (y compris auto-réponse)
    db.refresh(conversation)
    # Recharger explicitement les messages pour inclure les nouveaux messages auto-réponse
    db.expire(conversation, ['messages'])
    _ = conversation.messages  # Force le rechargement de la relation
    
    # Construire la réponse avec messages et notes (triés par date)
    messages = [
        MessageRead(
            id=msg.id,
            conversation_id=msg.conversation_id,
            from_name=msg.from_name,
            from_email=msg.from_email,
            from_phone=msg.from_phone,
            content=msg.content,
            source=msg.source,
            is_from_client=msg.is_from_client,
            read=msg.read,
            external_id=msg.external_id,
            external_metadata=msg.external_metadata,
            created_at=msg.created_at,
            attachments=[
                AttachmentRead(
                    id=att.id,
                    message_id=att.message_id,
                    name=att.name,
                    file_type=att.file_type,
                    file_path=att.file_path,
                    file_size=att.file_size,
                    mime_type=att.mime_type,
                    created_at=att.created_at,
                )
                for att in msg.attachments
            ],
        )
        for msg in sorted(conversation.messages, key=lambda m: m.created_at or datetime.min)
    ]
    
    notes = [
        InternalNoteRead(
            id=note.id,
            conversation_id=note.conversation_id,
            author_id=note.author_id,
            author_name=note.author.full_name if note.author else None,
            content=note.content,
            created_at=note.created_at,
        )
        for note in conversation.internal_notes
    ]
    
    # Récupérer le premier message du client pour l'email/téléphone
    first_client_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == True
    ).order_by(InboxMessage.created_at.asc()).first()
    
    # Récupérer le contenu de la réponse en attente
    pending_reply_content = conversation.pending_auto_reply_content
    print(f"[DEBUG] Conversation {conversation.id}: auto_reply_pending={conversation.auto_reply_pending}, mode={conversation.auto_reply_mode}, content_length={len(pending_reply_content) if pending_reply_content else 0}")
    
    return ConversationDetail(
        id=conversation.id,
        company_id=conversation.company_id,
        subject=conversation.subject,
        status=conversation.status,
        source=conversation.source,
        client_id=conversation.client_id,
        folder_id=conversation.folder_id,
        assigned_to_id=conversation.assigned_to_id,
        is_urgent=conversation.is_urgent,
        ai_classified=conversation.ai_classified,
        classification_confidence=conversation.classification_confidence,
        auto_reply_sent=conversation.auto_reply_sent,
        auto_reply_pending=conversation.auto_reply_pending,
        auto_reply_mode=conversation.auto_reply_mode,
        pending_reply_content=pending_reply_content,
        unread_count=conversation.unread_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        client_name=(
            conversation.client.name if conversation.client 
            else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
        ),
        assigned_to_name=conversation.assigned_to.full_name if conversation.assigned_to else None,
        folder_name=conversation.folder.name if conversation.folder else None,
        client_email=first_client_message.from_email if first_client_message else None,
        client_phone=first_client_message.from_phone if first_client_message else None,
        messages=messages,
        internal_notes=notes,
    )


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée une nouvelle conversation avec son premier message.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que le client appartient à l'entreprise si fourni
    if conversation_data.client_id:
        client = db.query(Client).filter(
            Client.id == conversation_data.client_id,
            Client.company_id == current_user.company_id
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
    
    # Créer la conversation
    conversation = Conversation(
        company_id=current_user.company_id,
        subject=conversation_data.subject,
        status=conversation_data.status,
        source=conversation_data.source,
        client_id=conversation_data.client_id,
        folder_id=conversation_data.folder_id,
        assigned_to_id=conversation_data.assigned_to_id,
        is_urgent=conversation_data.is_urgent,
        unread_count=1 if conversation_data.first_message.is_from_client else 0,
        last_message_at=datetime.utcnow(),
    )
    db.add(conversation)
    db.flush()  # Pour obtenir l'ID
    
    # Créer le premier message
    message = InboxMessage(
        conversation_id=conversation.id,
        from_name=conversation_data.first_message.from_name,
        from_email=conversation_data.first_message.from_email,
        from_phone=conversation_data.first_message.from_phone,
        content=conversation_data.first_message.content,
        source=conversation_data.first_message.source,
        is_from_client=conversation_data.first_message.is_from_client,
        read=not conversation_data.first_message.is_from_client,  # Lu si c'est l'entreprise qui envoie
        external_id=conversation_data.first_message.external_id,
        external_metadata=conversation_data.first_message.external_metadata,
    )
    db.add(message)
    db.flush()  # Pour obtenir l'ID du message
    
    # Classification automatique du statut pour la nouvelle conversation
    if conversation.status not in ["Archivé", "Spam", "Urgent"]:
        # Classer automatiquement selon les règles
        new_status = auto_classify_conversation_status(db, conversation, message)
        conversation.status = new_status
    
    # Classification automatique dans un dossier avec filtres (seulement si aucun dossier n'est déjà assigné)
    folder_was_assigned = False
    if conversation.folder_id is None:
        from app.core.folder_ai_classifier import classify_conversation_to_folder
        folder_id = classify_conversation_to_folder(
            db=db,
            conversation=conversation,
            message=message,
            company_id=current_user.company_id
        )
        if folder_id:
            conversation.folder_id = folder_id
            folder_was_assigned = True
            print(f"[INBOX CREATE] Conversation {conversation.id} classée automatiquement dans le dossier ID: {folder_id}")
    
    db.commit()
    db.refresh(conversation)
    
    # Traiter la réponse automatique si le premier message vient du client ET que la conversation est dans un dossier
    # IMPORTANT: Déclencher l'auto-réponse dès qu'un message entre dans un dossier avec auto-réponse activée
    if conversation_data.first_message.is_from_client and conversation.folder_id:
        from app.core.auto_reply_service import trigger_auto_reply_if_needed
        trigger_auto_reply_if_needed(db, conversation, message)
    
    # Si c'est une conversation email et que le message vient de l'entreprise, envoyer l'email via SMTP
    if conversation.source == "email" and not conversation_data.first_message.is_from_client:
        try:
            # Récupérer la boîte mail principale
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            
            if primary_integration and primary_integration.email_address and primary_integration.email_password:
                # Trouver le destinataire
                to_email = None
                if conversation.client and conversation.client.email:
                    to_email = conversation.client.email
                elif conversation_data.first_message.from_email:
                    # Utiliser l'email fourni dans le message (destinataire)
                    to_email = conversation_data.first_message.from_email
                
                if to_email:
                    # Déterminer la configuration SMTP
                    smtp_config = get_smtp_config(primary_integration.email_address)
                    
                    # Envoyer l'email via SMTP
                    print(f"[INBOX] Envoi du nouveau message via SMTP de {primary_integration.email_address} à {to_email}")
                    send_email_smtp(
                        smtp_server=smtp_config["smtp_server"],
                        smtp_port=smtp_config["smtp_port"],
                        email_address=primary_integration.email_address,
                        password=primary_integration.email_password,
                        to_email=to_email,
                        subject=conversation.subject or "Sans objet",
                        content=conversation_data.first_message.content,
                        use_tls=smtp_config["use_tls"],
                        attachments=None,  # Pas de pièces jointes pour le premier message
                        from_name=conversation_data.first_message.from_name or current_user.full_name
                    )
                    print(f"[INBOX] Email envoyé avec succès à {to_email}")
                else:
                    print(f"[INBOX] Impossible d'envoyer l'email: destinataire non trouvé")
            else:
                print(f"[INBOX] Impossible d'envoyer l'email: aucune boîte mail principale configurée")
        except Exception as e:
            # On log l'erreur mais on ne fait pas échouer la création de la conversation
            print(f"[INBOX] Erreur lors de l'envoi de l'email via SMTP: {e}")
            import traceback
            traceback.print_exc()
    
    # Si c'est une conversation SMS et que le message vient de l'entreprise, envoyer le SMS via Twilio
    elif conversation.source == "sms" and not conversation_data.first_message.is_from_client:
        try:
            # Récupérer l'intégration SMS active pour cette entreprise
            sms_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "sms"
            ).first()
            
            if sms_integration and sms_integration.account_id and sms_integration.api_key and sms_integration.phone_number:
                # Trouver le destinataire (le client de la conversation ou from_email dans first_message)
                to_phone = None
                if conversation.client and conversation.client.phone:
                    to_phone = conversation.client.phone
                elif conversation_data.first_message.from_phone:
                    to_phone = conversation_data.first_message.from_phone
                
                if to_phone:
                    # Initialiser le service SMS avec les credentials Vonage
                    # api_key = API Key Vonage, webhook_secret = API Secret Vonage
                    sms_service = VonageSMSService(
                        api_key=sms_integration.api_key,
                        api_secret=sms_integration.webhook_secret or ""  # Utiliser webhook_secret pour stocker api_secret
                    )
                    
                    # Envoyer le SMS
                    print(f"[INBOX CREATE] Envoi du SMS via Vonage de {sms_integration.phone_number} à {to_phone}")
                    result = sms_service.send_sms(
                        to=to_phone,
                        message=conversation_data.first_message.content,
                        from_number=sms_integration.phone_number
                    )
                    
                    if result.get("success"):
                        # Mettre à jour le message avec l'ID Vonage
                        message.external_id = result.get("message_id")
                        message.external_metadata = {
                            **(message.external_metadata or {}),
                            "vonage_message_id": result.get("message_id"),
                            "provider": "vonage"
                        }
                        db.commit()
                        db.refresh(message)
                        print(f"[INBOX CREATE] SMS envoyé avec succès: {result.get('message_id')}")
                    else:
                        print(f"[INBOX CREATE] Erreur lors de l'envoi du SMS: {result.get('error')}")
                else:
                    print(f"[INBOX CREATE] Impossible d'envoyer le SMS: destinataire non trouvé")
            else:
                print(f"[INBOX CREATE] Impossible d'envoyer le SMS: aucune intégration SMS configurée")
        except Exception as e:
            # On log l'erreur mais on ne fait pas échouer la création de la conversation
            print(f"[INBOX CREATE] Erreur lors de l'envoi du SMS via Vonage: {e}")
            import traceback
            traceback.print_exc()
    
    # Récupérer le premier message du client pour le nom
    first_client_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == True
    ).order_by(InboxMessage.created_at.asc()).first()
    
    return ConversationRead(
        id=conversation.id,
        company_id=conversation.company_id,
        subject=conversation.subject,
        status=conversation.status,
        source=conversation.source,
        client_id=conversation.client_id,
        folder_id=conversation.folder_id,
        assigned_to_id=conversation.assigned_to_id,
        is_urgent=conversation.is_urgent,
        ai_classified=conversation.ai_classified,
        classification_confidence=conversation.classification_confidence,
        auto_reply_sent=conversation.auto_reply_sent,
        auto_reply_pending=conversation.auto_reply_pending,
        auto_reply_mode=conversation.auto_reply_mode,
        unread_count=conversation.unread_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        client_name=(
            conversation.client.name if conversation.client 
            else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
        ),
        assigned_to_name=conversation.assigned_to.full_name if conversation.assigned_to else None,
        folder_name=conversation.folder.name if conversation.folder else None,
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationRead)
def update_conversation(
    conversation_id: int,
    conversation_data: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour une conversation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Mettre à jour uniquement les champs fournis
    update_data = conversation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(conversation, field, value)
    
    db.commit()
    db.refresh(conversation)
    
    # Récupérer le premier message du client pour le nom
    first_client_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == True
    ).order_by(InboxMessage.created_at.asc()).first()
    
    return ConversationRead(
        id=conversation.id,
        company_id=conversation.company_id,
        subject=conversation.subject,
        status=conversation.status,
        source=conversation.source,
        client_id=conversation.client_id,
        folder_id=conversation.folder_id,
        assigned_to_id=conversation.assigned_to_id,
        is_urgent=conversation.is_urgent,
        ai_classified=conversation.ai_classified,
        classification_confidence=conversation.classification_confidence,
        auto_reply_sent=conversation.auto_reply_sent,
        auto_reply_pending=conversation.auto_reply_pending,
        auto_reply_mode=conversation.auto_reply_mode,
        unread_count=conversation.unread_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        client_name=(
            conversation.client.name if conversation.client 
            else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
        ),
        assigned_to_name=conversation.assigned_to.full_name if conversation.assigned_to else None,
        folder_name=conversation.folder.name if conversation.folder else None,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int,
    delete_on_imap: bool = Query(True, description="Supprimer aussi l'email sur le serveur IMAP"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime une conversation et tous ses messages associés.
    Si delete_on_imap est True et que la conversation contient des emails (source="email"),
    les emails seront aussi supprimés sur le serveur IMAP d'origine.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Si c'est une conversation email et qu'on veut supprimer sur IMAP
    if delete_on_imap and conversation.source == "email":
        # Récupérer tous les messages de la conversation avec un external_id (Message-ID)
        messages = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conversation_id,
            InboxMessage.external_id.isnot(None)
        ).all()
        
        # Récupérer les intégrations IMAP actives de l'entreprise
        integrations = db.query(InboxIntegration).filter(
            InboxIntegration.company_id == current_user.company_id,
            InboxIntegration.integration_type == "imap",
            InboxIntegration.is_active == True
        ).all()
        
        # Pour chaque message, essayer de le supprimer sur IMAP
        for message in messages:
            if not message.external_id:
                continue
            
            # Essayer de trouver l'intégration correspondante
            # On essaie de trouver par l'adresse email dans external_metadata ou par défaut la première intégration
            integration = None
            if message.external_metadata and message.external_metadata.get("to"):
                # Chercher une intégration qui correspond à l'adresse email destinataire
                to_email = message.external_metadata.get("to")
                for integ in integrations:
                    if integ.email_address and to_email and integ.email_address.lower() in to_email.lower():
                        integration = integ
                        break
            
            # Si pas trouvé, prendre la première intégration active
            if not integration and integrations:
                integration = integrations[0]
            
            # Supprimer sur IMAP si on a trouvé une intégration
            if integration and integration.email_address and integration.email_password:
                try:
                    deleted = await delete_email_imap_async(
                        imap_server=integration.imap_server or "imap.gmail.com",
                        imap_port=integration.imap_port or 993,
                        email_address=integration.email_address,
                        password=integration.email_password,
                        message_id=message.external_id,
                        use_ssl=integration.use_ssl if integration.use_ssl is not None else True
                    )
                    if deleted:
                        print(f"[DELETE] Email {message.external_id} supprimé sur IMAP avec succès")
                    else:
                        print(f"[DELETE] Impossible de supprimer l'email {message.external_id} sur IMAP (non trouvé ou déjà supprimé)")
                except Exception as e:
                    print(f"[DELETE] Erreur lors de la suppression IMAP pour {message.external_id}: {e}")
                    # On continue même en cas d'erreur IMAP, on supprime quand même de la DB
    
    # Les messages et notes seront supprimés automatiquement grâce à cascade
    db.delete(conversation)
    db.commit()
    
    return


@router.delete("/conversations/bulk", status_code=status.HTTP_200_OK)
async def delete_conversations_bulk(
    conversation_ids: List[int] = Body(..., description="Liste des IDs des conversations à supprimer"),
    delete_on_imap: bool = Body(False, description="Supprimer aussi les emails sur le serveur IMAP"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime plusieurs conversations en une seule opération.
    Utilise la même logique que la suppression individuelle pour chaque conversation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if not conversation_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune conversation à supprimer"
        )
    
    # Récupérer les intégrations IMAP actives de l'entreprise (une seule fois pour toutes les conversations)
    integrations = []
    if delete_on_imap:
        integrations = db.query(InboxIntegration).filter(
            InboxIntegration.company_id == current_user.company_id,
            InboxIntegration.integration_type == "imap",
            InboxIntegration.is_active == True
        ).all()
    
    deleted_count = 0
    errors = []
    
    # Pour chaque conversation, utiliser la même logique que delete_conversation
    for conversation_id in conversation_ids:
        try:
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.company_id == current_user.company_id
            ).first()
            
            if not conversation:
                errors.append(f"Conversation {conversation_id} non trouvée")
                continue
            
            # Si c'est une conversation email et qu'on veut supprimer sur IMAP
            if delete_on_imap and conversation.source == "email":
                # Récupérer tous les messages de la conversation avec un external_id (Message-ID)
                messages = db.query(InboxMessage).filter(
                    InboxMessage.conversation_id == conversation_id,
                    InboxMessage.external_id.isnot(None)
                ).all()
                
                # Pour chaque message, essayer de le supprimer sur IMAP
                for message in messages:
                    if not message.external_id:
                        continue
                    
                    # Essayer de trouver l'intégration correspondante
                    integration = None
                    if message.external_metadata and message.external_metadata.get("to"):
                        to_email = message.external_metadata.get("to")
                        for integ in integrations:
                            if integ.email_address and to_email and integ.email_address.lower() in to_email.lower():
                                integration = integ
                                break
                    
                    # Si pas trouvé, prendre la première intégration active
                    if not integration and integrations:
                        integration = integrations[0]
                    
                    # Supprimer sur IMAP si on a trouvé une intégration
                    if integration and integration.email_address and integration.email_password:
                        try:
                            deleted = await delete_email_imap_async(
                                imap_server=integration.imap_server or "imap.gmail.com",
                                imap_port=integration.imap_port or 993,
                                email_address=integration.email_address,
                                password=integration.email_password,
                                message_id=message.external_id,
                                use_ssl=integration.use_ssl if integration.use_ssl is not None else True
                            )
                            if deleted:
                                print(f"[DELETE BULK] Email {message.external_id} supprimé sur IMAP avec succès")
                        except Exception as e:
                            print(f"[DELETE BULK] Erreur lors de la suppression IMAP pour {message.external_id}: {e}")
                            # On continue même en cas d'erreur IMAP
            
            # Supprimer les messages associés
            db.query(InboxMessage).filter(InboxMessage.conversation_id == conversation_id).delete()
            # Supprimer les notes internes
            db.query(InternalNote).filter(InternalNote.conversation_id == conversation_id).delete()
            # Supprimer la conversation
            db.delete(conversation)
            deleted_count += 1
            
        except Exception as e:
            errors.append(f"Erreur lors de la suppression de la conversation {conversation_id}: {str(e)}")
            logger.error(f"Erreur lors de la suppression de la conversation {conversation_id}: {e}")
            continue
    
    db.commit()
    
    if errors:
        logger.warning(f"Erreurs lors de la suppression en masse: {errors}")
    
    return {
        "message": f"{deleted_count} conversation(s) supprimée(s) avec succès" + (f" ({len(errors)} erreur(s))" if errors else ""),
        "deleted_count": deleted_count,
        "errors": errors if errors else None
    }

@router.delete("/conversations", status_code=status.HTTP_200_OK)
def delete_all_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime toutes les conversations de l'entreprise de l'utilisateur.
    ⚠️ ATTENTION : Cette action est irréversible !
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer toutes les conversations de l'entreprise
    conversations = db.query(Conversation).filter(
        Conversation.company_id == current_user.company_id
    ).all()
    
    deleted_count = len(conversations)
    
    # Supprimer toutes les conversations (les messages et notes seront supprimés automatiquement grâce à cascade)
    for conversation in conversations:
        db.delete(conversation)
    
    db.commit()
    
    return {
        "message": f"{deleted_count} conversation(s) supprimée(s) avec succès",
        "deleted_count": deleted_count
    }


# ===== MESSAGES =====

@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def create_message(
    conversation_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Ajoute un message à une conversation existante.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que la conversation existe et appartient à l'entreprise
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Créer le message
    message = InboxMessage(
        conversation_id=conversation_id,
        from_name=message_data.from_name,
        from_email=message_data.from_email,
        from_phone=message_data.from_phone,
        content=message_data.content,
        source=message_data.source,
        is_from_client=message_data.is_from_client,
        read=not message_data.is_from_client,  # Lu si c'est l'entreprise qui envoie
        external_id=message_data.external_id,
        external_metadata=message_data.external_metadata,
    )
    db.add(message)
    db.flush()
    
    # Créer les attachments si fournis
    attachments = []
    if message_data.attachments:
        for att_data in message_data.attachments:
            attachment = MessageAttachment(
                message_id=message.id,
                name=att_data.get("name", ""),
                file_type=att_data.get("file_type", "other"),
                file_path=att_data.get("file_path", ""),
                file_size=att_data.get("file_size", 0),
                mime_type=att_data.get("mime_type"),
            )
            db.add(attachment)
            attachments.append(attachment)
    
    # Mettre à jour la conversation
    conversation.last_message_at = datetime.utcnow()
    if message_data.is_from_client:
        conversation.unread_count += 1
    
    # Classification automatique du statut (si pas déjà manuel)
    if conversation.status not in ["Archivé", "Spam", "Urgent"]:
        # Classer automatiquement selon les règles (en tenant compte du nouveau message)
        new_status = auto_classify_conversation_status(db, conversation, message)
        conversation.status = new_status
    
    # Classification automatique dans un dossier (seulement si aucun dossier n'est déjà assigné)
    old_folder_id = conversation.folder_id
    if conversation.folder_id is None:
        from app.core.folder_ai_classifier import classify_conversation_to_folder
        folder_id = classify_conversation_to_folder(
            db=db,
            conversation=conversation,
            message=message,
            company_id=current_user.company_id
        )
        if folder_id:
            conversation.folder_id = folder_id
            print(f"[INBOX ADD MESSAGE] Conversation {conversation.id} classée automatiquement dans le dossier ID: {folder_id}")
    
    # Si l'entreprise répond manuellement, réinitialiser auto_reply_sent pour permettre de nouvelles auto-réponses
    if not message_data.is_from_client:
        conversation.auto_reply_sent = False
        # Si c'était une réponse en attente qui vient d'être approuvée, mettre à jour auto_reply_pending
        if conversation.auto_reply_pending and conversation.auto_reply_mode == "approval":
            conversation.auto_reply_pending = False
            # Nettoyer le contenu de la réponse en attente
            conversation.pending_auto_reply_content = None
    
    db.commit()
    db.refresh(message)
    db.refresh(conversation)
    
    # Traiter la réponse automatique si le message vient du client ET que la conversation est dans un dossier
    # IMPORTANT: Déclencher l'auto-réponse dès qu'un message entre dans un dossier avec auto-réponse activée
    # (soit dossier déjà assigné, soit nouvellement assigné via classification)
    if message_data.is_from_client and conversation.folder_id:
        from app.core.auto_reply_service import trigger_auto_reply_if_needed
        trigger_auto_reply_if_needed(db, conversation, message)
    
    # Si c'est une conversation email et que le message vient de l'entreprise, envoyer l'email via SMTP
    if conversation.source == "email" and not message_data.is_from_client:
        try:
            # Récupérer la boîte mail principale
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            
            if primary_integration and primary_integration.email_address and primary_integration.email_password:
                # Trouver le destinataire (le client de la conversation)
                to_email = None
                if conversation.client and conversation.client.email:
                    to_email = conversation.client.email
                else:
                    # Sinon, chercher dans les messages précédents de la conversation
                    previous_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conversation_id,
                        InboxMessage.is_from_client == True,
                        InboxMessage.from_email.isnot(None)
                    ).order_by(InboxMessage.created_at.desc()).first()
                    
                    if previous_message:
                        to_email = previous_message.from_email
                
                if to_email:
                    # Déterminer la configuration SMTP
                    smtp_config = get_smtp_config(primary_integration.email_address)
                    
                    # Préparer les pièces jointes pour l'envoi SMTP
                    smtp_attachments = []
                    if attachments:
                        for att in attachments:
                            if att.file_path:
                                # Le file_path stocké est relatif à UPLOAD_DIR et inclut déjà company_id
                                file_path = UPLOAD_DIR / att.file_path
                                if file_path.exists():
                                    smtp_attachments.append({
                                        "path": str(file_path),
                                        "filename": att.name
                                    })
                    
                    # Envoyer l'email via SMTP
                    print(f"[INBOX] Envoi de l'email via SMTP de {primary_integration.email_address} à {to_email}")
                    send_email_smtp(
                        smtp_server=smtp_config["smtp_server"],
                        smtp_port=smtp_config["smtp_port"],
                        email_address=primary_integration.email_address,
                        password=primary_integration.email_password,
                        to_email=to_email,
                        subject=conversation.subject or "Sans objet",
                        content=message_data.content,
                        use_tls=smtp_config["use_tls"],
                        attachments=smtp_attachments if smtp_attachments else None,
                        from_name=message_data.from_name or current_user.full_name
                    )
                    print(f"[INBOX] Email envoyé avec succès à {to_email}")
                else:
                    print(f"[INBOX] Impossible d'envoyer l'email: destinataire non trouvé")
            else:
                print(f"[INBOX] Impossible d'envoyer l'email: aucune boîte mail principale configurée")
        except Exception as e:
            # On log l'erreur mais on ne fait pas échouer la création du message
            print(f"[INBOX] Erreur lors de l'envoi de l'email via SMTP: {e}")
            import traceback
            traceback.print_exc()
    
    # Si c'est une conversation SMS et que le message vient de l'entreprise, envoyer le SMS via Twilio
    elif conversation.source == "sms" and not message_data.is_from_client:
        try:
            # Récupérer l'intégration SMS active pour cette entreprise
            sms_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "sms"
            ).first()
            
            if sms_integration and sms_integration.account_id and sms_integration.api_key and sms_integration.phone_number:
                # Trouver le destinataire (le client de la conversation)
                to_phone = None
                if conversation.client and conversation.client.phone:
                    to_phone = conversation.client.phone
                else:
                    # Sinon, chercher dans les messages précédents de la conversation
                    previous_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conversation_id,
                        InboxMessage.is_from_client == True,
                        InboxMessage.from_phone.isnot(None)
                    ).order_by(InboxMessage.created_at.desc()).first()
                    
                    if previous_message:
                        to_phone = previous_message.from_phone
                
                if to_phone:
                    # Initialiser le service SMS avec les credentials Vonage
                    # api_key = API Key Vonage, webhook_secret = API Secret Vonage
                    sms_service = VonageSMSService(
                        api_key=sms_integration.api_key,
                        api_secret=sms_integration.webhook_secret or ""  # Utiliser webhook_secret pour stocker api_secret
                    )
                    
                    # Envoyer le SMS
                    print(f"[INBOX] Envoi du SMS via Vonage de {sms_integration.phone_number} à {to_phone}")
                    result = sms_service.send_sms(
                        to=to_phone,
                        message=message_data.content,
                        from_number=sms_integration.phone_number
                    )
                    
                    if result.get("success"):
                        # Mettre à jour le message avec l'ID Vonage
                        message.external_id = result.get("message_id")
                        message.external_metadata = {
                            **(message.external_metadata or {}),
                            "vonage_message_id": result.get("message_id"),
                            "provider": "vonage"
                        }
                        db.commit()
                        print(f"[INBOX] SMS envoyé avec succès: {result.get('message_id')}")
                    else:
                        print(f"[INBOX] Erreur lors de l'envoi du SMS: {result.get('error')}")
                else:
                    print(f"[INBOX] Impossible d'envoyer le SMS: destinataire non trouvé")
            else:
                print(f"[INBOX] Impossible d'envoyer le SMS: aucune intégration SMS configurée")
        except Exception as e:
            # On log l'erreur mais on ne fait pas échouer la création du message
            print(f"[INBOX] Erreur lors de l'envoi du SMS via Twilio: {e}")
            import traceback
            traceback.print_exc()
    
    # Construire la réponse avec les attachments
    attachment_reads = [
        AttachmentRead(
            id=att.id,
            message_id=att.message_id,
            name=att.name,
            file_type=att.file_type,
            file_path=att.file_path,
            file_size=att.file_size,
            mime_type=att.mime_type,
            created_at=att.created_at,
        )
        for att in attachments
    ]
    
    return MessageRead(
        id=message.id,
        conversation_id=message.conversation_id,
        from_name=message.from_name,
        from_email=message.from_email,
        from_phone=message.from_phone,
        content=message.content,
        source=message.source,
        is_from_client=message.is_from_client,
        read=message.read,
        external_id=message.external_id,
        external_metadata=message.external_metadata,
        created_at=message.created_at,
        attachments=attachment_reads,
    )


@router.post("/conversations/{conversation_id}/messages/upload", response_model=dict)
async def upload_attachment(
    conversation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload un fichier pour une conversation. Retourne les infos du fichier uploadé.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que la conversation existe
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Vérifier la taille du fichier
    file_content = await file.read()
    file_size = len(file_content)
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Vérifier l'extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # SÉCURITÉ: Vérifier le MIME type réel du fichier (pas seulement l'extension)
    import filetype
    detected_type = filetype.guess(file_content)
    if detected_type:
        real_mime_type = detected_type.mime
        if real_mime_type not in settings.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type mismatch. Detected MIME type '{real_mime_type}' is not allowed. "
                       f"Allowed types: {', '.join(settings.ALLOWED_MIME_TYPES)}"
            )
    else:
        # Si le type ne peut pas être détecté, vérifier au moins que ce n'est pas un exécutable
        # Les fichiers exécutables ont souvent des signatures spécifiques
        if file_content[:2] == b'MZ' or file_content[:4] == b'\x7fELF':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Executable files are not allowed"
        )
    
    # Générer un nom de fichier unique
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
    company_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = company_upload_dir / unique_filename
    
    # Sauvegarder le fichier
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Retourner les infos du fichier (sera associé au message lors de la création)
    return {
        "filename": file.filename,
        "file_path": str(file_path.relative_to(UPLOAD_DIR)),
        "file_type": get_file_type(file.filename),
        "file_size": file_size,
        "mime_type": file.content_type,
    }


@router.get("/attachments/{file_path:path}")
async def get_attachment(
    file_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère un fichier uploadé.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # SÉCURITÉ: Protection renforcée contre path traversal
    # Normaliser et résoudre le chemin pour éviter les attaques
    safe_path = Path(file_path)
    
    # Vérifier qu'il n'y a pas de tentatives de path traversal
    if ".." in str(safe_path) or safe_path.is_absolute():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )
    
    # Construire le chemin de base autorisé pour cette entreprise
    expected_base = (UPLOAD_DIR / str(current_user.company_id)).resolve()
    
    # Le file_path peut être soit juste le nom du fichier, soit company_id/fichier
    # Vérifier si le chemin commence déjà par le company_id
    path_parts = safe_path.parts
    if path_parts and path_parts[0] == str(current_user.company_id):
        # Le chemin inclut déjà le company_id
        full_path = (UPLOAD_DIR / safe_path).resolve()
    else:
        # Le chemin est juste le nom du fichier, ajouter le company_id
        full_path = (UPLOAD_DIR / str(current_user.company_id) / safe_path).resolve()
    
    # SÉCURITÉ: Vérifier que le chemin final est bien dans le répertoire autorisé
    # Cela empêche l'accès à des fichiers d'autres entreprises ou en dehors d'UPLOAD_DIR
    if not str(full_path).startswith(str(expected_base)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Invalid file path"
        )
    
    # Vérifier que le fichier existe et est bien un fichier (pas un répertoire)
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(
        path=str(full_path),
        filename=safe_path.name,
        media_type="application/octet-stream"
    )


# ===== INTERNAL NOTES =====

@router.post("/conversations/{conversation_id}/notes", response_model=InternalNoteRead, status_code=status.HTTP_201_CREATED)
def create_internal_note(
    conversation_id: int,
    note_data: InternalNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Ajoute une note interne à une conversation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que la conversation existe et appartient à l'entreprise
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Créer la note
    note = InternalNote(
        conversation_id=conversation_id,
        author_id=current_user.id,
        content=note_data.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return InternalNoteRead(
        id=note.id,
        conversation_id=note.conversation_id,
        author_id=note.author_id,
        author_name=note.author.full_name if note.author else None,
        content=note.content,
        created_at=note.created_at,
    )


# ===== FOLDERS =====

@router.post("/conversations/{conversation_id}/reclassify", response_model=ConversationRead)
def reclassify_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reclasse automatiquement une conversation dans un dossier avec l'IA.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Récupérer le dernier message
    last_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation_id
    ).order_by(InboxMessage.created_at.desc()).first()
    
    if not last_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No message found in conversation"
        )
    
    # Tenter la classification
    from app.core.folder_ai_classifier import classify_conversation_to_folder
    old_folder_id = conversation.folder_id
    folder_id = classify_conversation_to_folder(
        db=db,
        conversation=conversation,
        message=last_message,
        company_id=current_user.company_id
    )
    
    if folder_id:
        conversation.folder_id = folder_id
        db.commit()
        db.refresh(conversation)
        
        # Si le dossier vient d'être assigné et que le dernier message vient du client, déclencher l'auto-réponse
        if old_folder_id != folder_id and last_message.is_from_client:
            from app.core.auto_reply_service import trigger_auto_reply_if_needed
            trigger_auto_reply_if_needed(db, conversation, last_message)
    
    # Récupérer le premier message du client pour le nom
    first_client_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == True
    ).order_by(InboxMessage.created_at.asc()).first()
    
    return ConversationRead(
        id=conversation.id,
        company_id=conversation.company_id,
        subject=conversation.subject,
        status=conversation.status,
        source=conversation.source,
        client_id=conversation.client_id,
        folder_id=conversation.folder_id,
        assigned_to_id=conversation.assigned_to_id,
        is_urgent=conversation.is_urgent,
        ai_classified=conversation.ai_classified,
        classification_confidence=conversation.classification_confidence,
        auto_reply_sent=conversation.auto_reply_sent,
        auto_reply_pending=conversation.auto_reply_pending,
        auto_reply_mode=conversation.auto_reply_mode,
        unread_count=conversation.unread_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        client_name=(
            conversation.client.name if conversation.client 
            else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
        ),
        assigned_to_name=conversation.assigned_to.full_name if conversation.assigned_to else None,
        folder_name=conversation.folder.name if conversation.folder else None,
    )


@router.post("/reclassify-all", status_code=status.HTTP_200_OK)
def reclassify_all_conversations_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reclasse manuellement toutes les conversations de l'entreprise.
    Utile pour déclencher la classification après avoir créé/modifié des dossiers.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    from app.core.folder_ai_classifier import reclassify_all_conversations
    
    try:
        logger.info(f"[MANUAL RECLASSIFY] Démarrage de la reclassification manuelle (FORCÉE) pour l'entreprise {current_user.company_id}")
        stats = reclassify_all_conversations(db=db, company_id=current_user.company_id, force=True)
        
        return {
            "message": "Reclassification terminée",
            "stats": {
                "total": stats["total"],
                "classified": stats["classified"],
                "not_classified": stats["not_classified"],
                "errors": stats["errors"]
            }
        }
    except Exception as e:
        logger.error(f"[MANUAL RECLASSIFY] Erreur: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la reclassification: {str(e)}"
        )


@router.get("/folders", response_model=List[FolderRead])
def get_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère tous les dossiers de l'entreprise.
    """
    try:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not attached to a company"
            )
        
        folders = db.query(InboxFolder).filter(
            InboxFolder.company_id == current_user.company_id
        ).order_by(InboxFolder.is_system.desc(), InboxFolder.name.asc()).all()
        
        return folders
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting folders: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting folders: {str(e)}"
        )


@router.post("/folders", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un nouveau dossier.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # SÉCURITÉ: Empêcher la création de dossiers système par les utilisateurs
    # Seuls les dossiers système peuvent être créés automatiquement par l'application
    if folder_data.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create system folders. System folders are created automatically."
        )
    
    folder = InboxFolder(
        company_id=current_user.company_id,
        name=folder_data.name,
        color=folder_data.color,
        folder_type=folder_data.folder_type,
        is_system=False,  # Forcer à False pour les dossiers créés par les utilisateurs
        ai_rules=folder_data.ai_rules,
        auto_reply=folder_data.auto_reply,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    
    logger.info(f"[FOLDER CREATE] Dossier créé: {folder.name} (ID: {folder.id})")
    logger.info(f"[FOLDER CREATE] ai_rules reçus: {folder_data.ai_rules}")
    
    # Toujours reclasser toutes les conversations lors de la création d'un nouveau dossier
    # Cela permet de classer les emails existants dans le nouveau dossier si ils correspondent
    logger.info(f"[FOLDER CREATE] ✅ Reclassification de toutes les conversations pour le nouveau dossier...")
    from app.core.folder_ai_classifier import reclassify_all_conversations
    try:
        # Utiliser force=False pour ne reclasser que les conversations sans dossier
        # Cela évite de déplacer des conversations déjà classées manuellement
        stats = reclassify_all_conversations(db=db, company_id=current_user.company_id, force=False)
        logger.info(f"[FOLDER CREATE] Reclassification terminée: {stats['classified']} conversation(s) classée(s), {stats['total']} totale(s)")
    except Exception as e:
        logger.error(f"[FOLDER CREATE] ❌ Erreur lors de la reclassification: {e}")
        import traceback
        traceback.print_exc()
        # Ne pas faire échouer la création du dossier si la reclassification échoue
    
    return folder


@router.patch("/folders/{folder_id}", response_model=FolderRead)
def update_folder(
    folder_id: int,
    folder_data: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour un dossier.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    folder = db.query(InboxFolder).filter(
        InboxFolder.id == folder_id,
        InboxFolder.company_id == current_user.company_id
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # SÉCURITÉ: Empêcher la modification des dossiers système
    if folder.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system folders. System folders are read-only."
        )
    
    # Vérifier si autoClassify était activé avant la modification
    old_ai_rules = folder.ai_rules or {}
    old_auto_classify = isinstance(old_ai_rules, dict) and old_ai_rules.get("autoClassify", False)
    
    # Mettre à jour uniquement les champs fournis
    update_data = folder_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)
    
    db.commit()
    db.refresh(folder)
    
    # Vérifier si autoClassify est activé maintenant
    new_ai_rules = folder.ai_rules or {}
    new_auto_classify = isinstance(new_ai_rules, dict) and new_ai_rules.get("autoClassify", False)
    
    # Reclasser toutes les conversations si autoClassify est activé (nouveau ou modifié)
    if new_auto_classify:
        logger.info(f"[FOLDER UPDATE] Classification automatique activée, reclassification de toutes les conversations...")
        from app.core.folder_ai_classifier import reclassify_all_conversations
        try:
            # Si autoClassify vient d'être activé, reclasser même celles déjà dans un dossier
            force = not old_auto_classify
            stats = reclassify_all_conversations(db=db, company_id=current_user.company_id, force=force)
            logger.info(f"[FOLDER UPDATE] Reclassification terminée: {stats['classified']} conversation(s) classée(s)")
        except Exception as e:
            logger.error(f"[FOLDER UPDATE] Erreur lors de la reclassification: {e}")
            # Ne pas faire échouer la modification du dossier si la reclassification échoue
    
    return folder


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime un dossier (non système).
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    folder = db.query(InboxFolder).filter(
        InboxFolder.id == folder_id,
        InboxFolder.company_id == current_user.company_id
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Empêcher la suppression des dossiers système
    # SÉCURITÉ: Empêcher la suppression des dossiers système
    if folder.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system folders. System folders are protected."
        )
    
    # Réinitialiser les conversations de ce dossier
    db.query(Conversation).filter(
        Conversation.folder_id == folder_id
    ).update({"folder_id": None})
    
    db.delete(folder)
    db.commit()
    
    return


@router.post("/conversations/{conversation_id}/generate-reply", response_model=dict)
async def generate_ai_reply(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Génère une réponse automatique avec l'IA basée sur les messages de la conversation.
    """
    # Récupérer la conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Récupérer tous les messages de la conversation
    messages = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation_id
    ).order_by(InboxMessage.created_at.asc()).all()
    
    # Préparer les messages pour le service IA
    messages_data = []
    for msg in messages:
        messages_data.append({
            "content": msg.content or "",
            "is_from_client": msg.is_from_client,
        })
    
    # Récupérer le prompt depuis les paramètres de l'entreprise (OBLIGATOIRE)
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    if not company_settings or not company_settings.settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun paramètre d'entreprise trouvé. Veuillez configurer les paramètres."
        )
    
    ia_settings = company_settings.settings.get("ia", {})
    inbox_settings = ia_settings.get("inbox", {})
    custom_prompt = inbox_settings.get("reply_prompt")
    
    if not custom_prompt or not custom_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun prompt configuré. Veuillez configurer le prompt dans les paramètres (Intelligence artificielle > Prompts IA pour l'inbox)."
        )
    
    logger.info(f"[GENERATE REPLY] Prompt récupéré depuis les paramètres: {repr(custom_prompt[:100])}...")
    
    # Générer la réponse avec l'IA
    # Utiliser le nom du client ou le nom de l'expéditeur comme fallback
    first_client_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == True
    ).order_by(InboxMessage.created_at.asc()).first()
    
    client_name = (
        conversation.client.name if conversation.client 
        else (first_client_message.from_name if first_client_message and first_client_message.from_name else None)
    )
    reply = ai_reply_service.generate_reply(
        conversation_messages=messages_data,
        client_name=client_name,
        custom_prompt=custom_prompt
    )
    
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI reply. Please check OpenAI API configuration."
        )
    
    return {"reply": reply}


@router.post("/conversations/{conversation_id}/summarize", response_model=dict)
async def summarize_conversation(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Résume la conversation avec l'IA.
    Rate limit: 5 requêtes par minute (coûteux en API OpenAI).
    """
    # Rate limiting pour les appels IA (coûteux)
    if limiter:
        limiter.limit("5/minute")(lambda: None)(request)
    # Récupérer la conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.company_id == current_user.company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Récupérer tous les messages de la conversation
    messages = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation_id
    ).order_by(InboxMessage.created_at.asc()).all()
    
    # Préparer les messages pour le service IA
    messages_data = []
    for msg in messages:
        messages_data.append({
            "content": msg.content or "",
            "is_from_client": msg.is_from_client,
        })
    
    # Récupérer le prompt personnalisé depuis les paramètres de l'entreprise
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    custom_prompt = None
    if company_settings and company_settings.settings:
        ia_settings = company_settings.settings.get("ia", {})
        inbox_settings = ia_settings.get("inbox", {})
        custom_prompt = inbox_settings.get("summary_prompt")
        
        # Logs pour débogage
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[SUMMARIZE] Company ID: {current_user.company_id}")
        logger.info(f"[SUMMARIZE] IA settings exists: {ia_settings is not None}")
        logger.info(f"[SUMMARIZE] Inbox settings exists: {inbox_settings is not None}")
        logger.info(f"[SUMMARIZE] Summary prompt retrieved: {repr(custom_prompt)}")
    
    # Vérifier qu'un prompt est configuré
    if not custom_prompt or not custom_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun prompt configuré pour résumer. Veuillez configurer le prompt dans les paramètres de l'entreprise."
        )
    
    # Générer le résumé avec l'IA
    summary = ai_reply_service.summarize_message(
        conversation_messages=messages_data,
        custom_prompt=custom_prompt
    )
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary. Please check OpenAI API configuration."
        )
    
    return {"summary": summary}

