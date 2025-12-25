"""
Routes webhooks pour recevoir les messages externes (email, WhatsApp, Messenger, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.session import get_db
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment
from app.db.models.client import Client
from app.db.models.company import Company
from app.db.models.inbox_integration import InboxIntegration
from app.api.schemas.inbox import MessageRead, AttachmentRead
from app.core.config import settings
from app.core.vonage_service import VonageSMSService
from app.core.conversation_classifier import auto_classify_conversation_status
import hmac
import hashlib
import json

router = APIRouter(prefix="/inbox/webhooks", tags=["inbox-webhooks"])


def verify_webhook_signature(
    payload: bytes,
    signature: Optional[str],
    secret: Optional[str]
) -> bool:
    """
    Vérifie la signature d'un webhook pour sécuriser les endpoints.
    """
    if not secret or not signature:
        return False
    
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


def require_webhook_signature(
    body: bytes,
    signature: Optional[str],
    secret: Optional[str]
) -> None:
    """
    Vérifie que le webhook a une signature valide si le secret est configuré.
    Lève une exception HTTP si la signature est invalide.
    """
    if secret:
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook signature required"
            )
        if not verify_webhook_signature(body, signature, secret):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )


# ===== EMAIL WEBHOOK =====

@router.post("/email")
async def receive_email_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None, alias="X-Webhook-Signature")
):
    """
    Webhook pour recevoir les emails depuis un service externe (SendGrid, Mailgun, etc.)
    ou depuis un service IMAP/POP3 personnalisé.
    
    Format attendu (JSON):
    {
        "from": {
            "email": "client@example.com",
            "name": "Nom du client"
        },
        "to": "entreprise@lokario.fr",
        "subject": "Sujet de l'email",
        "content": "Contenu du message",
        "html_content": "<p>Contenu HTML</p>",
        "attachments": [
            {
                "name": "fichier.pdf",
                "content": "base64_encoded_content",
                "mime_type": "application/pdf"
            }
        ],
        "message_id": "unique_message_id",
        "company_code": "123456"  # Code de l'entreprise pour identifier la company
    }
    """
    try:
        body = await request.body()
        data = await request.json()
        
        # SÉCURITÉ: Vérifier la signature du webhook si configurée
        # La signature HMAC protège contre l'utilisation frauduleuse du company_code
        require_webhook_signature(body, x_webhook_signature, settings.WEBHOOK_SECRET)
        
        # Identifier l'entreprise par code
        # NOTE: Le company_code est sécurisé par la signature HMAC ci-dessus.
        # Si WEBHOOK_SECRET est configuré, seuls les webhooks signés avec le bon secret peuvent utiliser le company_code.
        company_code = data.get("company_code")
        if not company_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_code is required"
            )
        
        company = db.query(Company).filter(Company.code == company_code).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Identifier ou créer le client par email
        from_email = data.get("from", {}).get("email")
        client = None
        if from_email:
            client = db.query(Client).filter(
                Client.company_id == company.id,
                Client.email == from_email
            ).first()
            
            # Si client non trouvé, créer un nouveau client
            if not client:
                client = Client(
                    company_id=company.id,
                    name=data.get("from", {}).get("name", from_email.split("@")[0]),
                    email=from_email,
                    type="Client"
                )
                db.add(client)
                db.flush()
        
        # Chercher une conversation existante ou en créer une nouvelle
        subject = data.get("subject", "")
        conversation = None
        
        if subject:
            # Chercher par sujet (thread email)
            conversation = db.query(Conversation).filter(
                Conversation.company_id == company.id,
                Conversation.subject == subject,
                Conversation.source == "email"
            ).first()
        
        if not conversation:
            # Créer une nouvelle conversation
            conversation = Conversation(
                company_id=company.id,
                client_id=client.id if client else None,
                subject=subject,
                status="À répondre",
                source="email",
                unread_count=1,
                last_message_at=datetime.utcnow(),
            )
            db.add(conversation)
            db.flush()
        
        # Créer le message
        content = data.get("html_content") or data.get("content", "")
        message = InboxMessage(
            conversation_id=conversation.id,
            from_name=data.get("from", {}).get("name", from_email or "Inconnu"),
            from_email=from_email,
            content=content,
            source="email",
            is_from_client=True,
            read=False,
            external_id=data.get("message_id"),
            external_metadata={
                "to": data.get("to"),
                "headers": data.get("headers", {}),
            }
        )
        db.add(message)
        db.flush()
        
        # Traiter les attachments si présents
        attachments_data = data.get("attachments", [])
        for att_data in attachments_data:
            # TODO: Décoder le contenu base64 et sauvegarder le fichier
            # Pour l'instant, on stocke juste les métadonnées
            attachment = MessageAttachment(
                message_id=message.id,
                name=att_data.get("name", "attachment"),
                file_type="other",  # TODO: Détecter le type
                file_path="",  # TODO: Sauvegarder le fichier
                file_size=0,  # TODO: Calculer la taille
                mime_type=att_data.get("mime_type"),
            )
            db.add(attachment)
        
        # Mettre à jour la conversation
        conversation.last_message_at = datetime.utcnow()
        conversation.unread_count += 1
        
        # TODO: Classification automatique IA si configurée
        # TODO: Auto-réponse si configurée
        
        db.commit()
        db.refresh(message)
        
        return {
            "status": "success",
            "conversation_id": conversation.id,
            "message_id": message.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing email webhook: {str(e)}"
        )


# ===== WHATSAPP WEBHOOK =====

@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None, alias="X-Webhook-Signature")
):
    """
    Webhook pour recevoir les messages WhatsApp depuis l'API WhatsApp Business.
    
    Format attendu (JSON):
    {
        "from": {
            "phone": "+33612345678",
            "name": "Nom du client"
        },
        "to": "+33123456789",
        "message": "Contenu du message",
        "message_id": "whatsapp_message_id",
        "company_code": "123456"
    }
    """
    try:
        body = await request.body()
        data = await request.json()
        
        # SÉCURITÉ: Vérifier la signature du webhook si configurée
        require_webhook_signature(body, x_webhook_signature, settings.WEBHOOK_SECRET)
        
        # Identifier l'entreprise
        company_code = data.get("company_code")
        if not company_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_code is required"
            )
        
        company = db.query(Company).filter(Company.code == company_code).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Identifier ou créer le client par téléphone
        from_phone = data.get("from", {}).get("phone")
        client = None
        if from_phone:
            client = db.query(Client).filter(
                Client.company_id == company.id,
                Client.phone == from_phone
            ).first()
            
            if not client:
                client = Client(
                    company_id=company.id,
                    name=data.get("from", {}).get("name", from_phone),
                    phone=from_phone,
                    type="Client"
                )
                db.add(client)
                db.flush()
        
        # Chercher une conversation existante ou en créer une nouvelle
        # Pour WhatsApp, on peut regrouper par client
        conversation = None
        if client:
            conversation = db.query(Conversation).filter(
                Conversation.company_id == company.id,
                Conversation.client_id == client.id,
                Conversation.source == "whatsapp",
                Conversation.status != "Résolu"
            ).order_by(Conversation.last_message_at.desc()).first()
        
        if not conversation:
            conversation = Conversation(
                company_id=company.id,
                client_id=client.id if client else None,
                subject=None,
                status="À répondre",
                source="whatsapp",
                unread_count=1,
                last_message_at=datetime.utcnow(),
            )
            db.add(conversation)
            db.flush()
        
        # Créer le message
        message = InboxMessage(
            conversation_id=conversation.id,
            from_name=data.get("from", {}).get("name", from_phone or "Inconnu"),
            from_phone=from_phone,
            content=data.get("message", ""),
            source="whatsapp",
            is_from_client=True,
            read=False,
            external_id=data.get("message_id"),
            external_metadata={
                "to": data.get("to"),
            }
        )
        db.add(message)
        
        # Mettre à jour la conversation
        conversation.last_message_at = datetime.utcnow()
        conversation.unread_count += 1
        
        db.commit()
        db.refresh(message)
        
        return {
            "status": "success",
            "conversation_id": conversation.id,
            "message_id": message.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing WhatsApp webhook: {str(e)}"
        )


# ===== SMS WEBHOOK (Vonage) =====

@router.post("/sms")
async def receive_sms_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook pour recevoir les SMS depuis Vonage.
    
    Format Vonage (form-data ou query params):
    - msisdn: Numéro expéditeur (33612345678)
    - to: Numéro destinataire (votre numéro Vonage)
    - text: Contenu du message
    - messageId: ID unique du message
    - message-timestamp: Timestamp
    
    URL du webhook à configurer dans Vonage:
    http://votre-domaine.com:8000/inbox/webhooks/sms
    (Pour le développement local, utiliser ngrok: https://votre-ngrok-url.ngrok.io/inbox/webhooks/sms)
    """
    try:
        # Log immédiatement pour confirmer que la requête arrive
        print("=" * 80)
        print(f"[SMS WEBHOOK] 📨 WEBHOOK SMS REÇU - {datetime.utcnow().isoformat()}")
        print(f"[SMS WEBHOOK] URL: {request.url}")
        print(f"[SMS WEBHOOK] Méthode: {request.method}")
        print(f"[SMS WEBHOOK] Headers: {dict(request.headers)}")
        print("=" * 80)
        
        # Format Vonage (form-data ou query params)
        form_data = await request.form()
        form_dict = dict(form_data)
        # Aussi vérifier les query params
        query_params = dict(request.query_params)
        webhook_dict = {**form_dict, **query_params}
        
        print(f"[SMS WEBHOOK] Données reçues: {webhook_dict}")
        
        # Traiter le webhook avec le service Vonage
        vonage_service = VonageSMSService(api_key="", api_secret="")  # Pas nécessaire pour la réception
        sms_data = vonage_service.receive_sms_webhook(webhook_dict)
        
        from_number = sms_data["from"]
        to_number = sms_data["to"]
        message_body = sms_data["body"]
        message_id = sms_data["message_id"]
        
        print(f"[SMS WEBHOOK] SMS parsé: De={from_number}, Vers={to_number}, Message='{message_body[:50]}...', ID={message_id}")
        
        # Trouver l'intégration SMS Vonage
        to_search = to_number.replace("+", "") if to_number else ""
        
        integration = db.query(InboxIntegration).filter(
            InboxIntegration.integration_type == "sms",
            InboxIntegration.is_active == True,
            InboxIntegration.phone_number.contains(to_search)
        ).first()
        
        if not integration:
            integration = db.query(InboxIntegration).filter(
                InboxIntegration.integration_type == "sms",
                InboxIntegration.is_active == True
            ).first()
        
        if not integration:
            print(f"[SMS WEBHOOK] ⚠️ Aucune intégration SMS trouvée pour {to_number}")
            return {"status": "integration_not_found", "message": f"Aucune intégration SMS active trouvée pour le numéro {to_number}"}
        
        # Créer ou trouver le client par téléphone
        client = None
        if from_number:
            # Normaliser le numéro pour la recherche (sans le +)
            phone_search = from_number.replace("+", "").replace(" ", "")
            
            client = db.query(Client).filter(
                Client.company_id == integration.company_id,
                Client.phone.contains(phone_search)
            ).first()
            
            if not client:
                # Créer un nouveau client
                client = Client(
                    company_id=integration.company_id,
                    name=from_number,  # Ou récupérer le nom via l'API si disponible
                    phone=from_number,
                    type="Client"
                )
                db.add(client)
                db.flush()
        
        # Trouver ou créer la conversation SMS
        conversation = None
        if client:
            conversation = db.query(Conversation).filter(
                Conversation.company_id == integration.company_id,
                Conversation.client_id == client.id,
                Conversation.source == "sms",
                Conversation.status != "Résolu"
            ).order_by(Conversation.last_message_at.desc()).first()
        
        if not conversation:
            conversation = Conversation(
                company_id=integration.company_id,
                client_id=client.id if client else None,
                subject=None,  # Pas de sujet pour les SMS
                status="À répondre",
                source="sms",
                unread_count=1,
                last_message_at=datetime.utcnow(),
            )
            db.add(conversation)
            db.flush()
            print(f"[SMS WEBHOOK] ✅ Nouvelle conversation SMS créée: ID={conversation.id} - Client={client.name if client else 'Inconnu'} - De={from_number}")
        else:
            print(f"[SMS WEBHOOK] Conversation SMS existante trouvée: ID={conversation.id} - Client={client.name if client else 'Inconnu'} - De={from_number}")
        
        # Utiliser l'ID Vonage
        external_message_id = message_id
        
        # Créer le message
        inbox_message = InboxMessage(
            conversation_id=conversation.id,
            from_name=client.name if client else from_number,
            from_phone=from_number,
            content=message_body,
            source="sms",
            is_from_client=True,
            read=False,
            external_id=external_message_id,
            external_metadata={
                "from": from_number,
                "to": to_number,
                "provider": "vonage",
                "num_media": sms_data.get("num_media", 0),
                "media_urls": sms_data.get("media_urls", [])
            }
        )
        db.add(inbox_message)
        db.flush()
        
        # Mettre à jour la conversation
        conversation.last_message_at = datetime.utcnow()
        conversation.unread_count += 1
        
        # Classification automatique du statut
        if conversation.status not in ["Archivé", "Spam", "Urgent"]:
            new_status = auto_classify_conversation_status(db, conversation, inbox_message)
            conversation.status = new_status
        
        # Classification automatique dans un dossier avec les filtres (seulement pour les conversations sans dossier)
        if conversation.folder_id is None:
            from app.core.folder_ai_classifier import classify_conversation_to_folder
            folder_id = classify_conversation_to_folder(
                db=db,
                conversation=conversation,
                message=inbox_message,
                company_id=integration.company_id
            )
            if folder_id:
                conversation.folder_id = folder_id
                print(f"[SMS WEBHOOK] ⚠️ Conversation {conversation.id} classée automatiquement dans le dossier ID: {folder_id} (ne sera PAS dans l'inbox principal)")
        
        db.commit()
        db.refresh(inbox_message)
        db.refresh(conversation)
        
        # Traiter la réponse automatique si la conversation est dans un dossier
        # IMPORTANT: Déclencher l'auto-réponse dès qu'un message entre dans un dossier avec auto-réponse activée
        if conversation.folder_id and inbox_message.is_from_client:
            from app.core.auto_reply_service import trigger_auto_reply_if_needed
            trigger_auto_reply_if_needed(db, conversation, inbox_message)
        
        folder_info = f" - Dossier ID={conversation.folder_id}" if conversation.folder_id else " - Pas de dossier (inbox principal)"
        print(f"[SMS WEBHOOK] ✅ Message SMS traité avec succès: Message-ID={message_id} - Conversation ID={conversation.id}{folder_info}")
        
        return {
            "status": "success",
            "conversation_id": conversation.id,
            "message_id": inbox_message.id,
            "folder_id": conversation.folder_id
        }
        
    except Exception as e:
        db.rollback()
        print(f"[SMS WEBHOOK] Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()
        # Retourner 200 même en cas d'erreur pour éviter que Vonage ne renvoie
        return {"status": "error", "error": str(e)}

