"""
Service pour gérer les réponses automatiques des dossiers inbox.
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.db.models.inbox_integration import InboxIntegration
from app.db.models.company_settings import CompanySettings
from app.core.ai_reply_service import ai_reply_service
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.vonage_service import VonageSMSService
from app.core.encryption_service import get_encryption_service
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def should_send_auto_reply(
    db: Session,
    conversation: Conversation,
    folder: Optional[InboxFolder]
) -> bool:
    """
    Vérifie si une réponse automatique doit être envoyée pour cette conversation.
    
    Args:
        db: Session de base de données
        conversation: La conversation
        folder: Le dossier de la conversation (si existe)
    
    Returns:
        True si une réponse automatique doit être envoyée
    """
    logger.info(f"[AUTO REPLY] Vérification pour conversation {conversation.id}, dossier: {folder.id if folder else None}")
    
    # Si pas de dossier, pas de réponse automatique
    if not folder:
        logger.info(f"[AUTO REPLY] Pas de dossier pour la conversation {conversation.id}")
        return False
    
    # Si pas de configuration auto_reply
    auto_reply_config = folder.auto_reply or {}
    logger.info(f"[AUTO REPLY] Configuration auto_reply: {auto_reply_config}")
    
    if not auto_reply_config.get("enabled", False):
        logger.info(f"[AUTO REPLY] Réponse automatique non activée pour le dossier {folder.id}")
        return False
    
    # Vérifier que le dernier message (chronologiquement) vient du client
    # Récupérer le dernier message de la conversation (le plus récent)
    last_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id
    ).order_by(InboxMessage.created_at.desc()).first()
    
    if not last_message:
        logger.info(f"[AUTO REPLY] Aucun message trouvé pour la conversation {conversation.id}")
        return False
    
    # Le dernier message doit venir du client
    if not last_message.is_from_client:
        logger.info(f"[AUTO REPLY] Le dernier message ne vient pas du client (is_from_client=False) pour la conversation {conversation.id}")
        return False
    
    # Vérifier que l'entreprise n'a pas répondu récemment (dans les 2 dernières minutes)
    # pour éviter les boucles infinies si l'auto-réponse échoue
    two_minutes_ago = datetime.now() - timedelta(minutes=2)
    recent_company_reply = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id,
        InboxMessage.is_from_client == False,
        InboxMessage.created_at >= two_minutes_ago
    ).first()
    
    if recent_company_reply:
        logger.info(f"[AUTO REPLY] L'entreprise a répondu récemment (dans les 2 dernières minutes), pas d'auto-réponse pour éviter les boucles")
        return False
    
    # Vérifier le mode
    mode = auto_reply_config.get("mode", "none")
    logger.info(f"[AUTO REPLY] Mode de réponse automatique: {mode}")
    
    if mode == "none":
        logger.info(f"[AUTO REPLY] Mode 'none' - pas de réponse automatique")
        return False
    
    logger.info(f"[AUTO REPLY] ✅ Conditions remplies pour envoyer une réponse automatique")
    return True


def generate_auto_reply_content(
    db: Session,
    conversation: Conversation,
    folder: InboxFolder,
    auto_reply_config: Dict[str, Any]
) -> Optional[str]:
    """
    Génère le contenu de la réponse automatique.
    
    Args:
        db: Session de base de données
        conversation: La conversation
        folder: Le dossier avec la configuration auto_reply
        auto_reply_config: La configuration auto_reply du dossier
    
    Returns:
        Le contenu de la réponse générée ou None en cas d'erreur
    """
    try:
        # Récupérer tous les messages de la conversation
        messages = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conversation.id
        ).order_by(InboxMessage.created_at.asc()).all()
        
        # Préparer les messages pour l'IA
        messages_data = []
        for msg in messages:
            messages_data.append({
                "content": msg.content or "",
                "is_from_client": msg.is_from_client,
            })
        
        # Récupérer le prompt depuis les settings de l'entreprise (OBLIGATOIRE)
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == conversation.company_id
        ).first()
        
        if not company_settings or not company_settings.settings:
            logger.error(f"[AUTO REPLY] Aucun paramètre d'entreprise trouvé pour la conversation {conversation.id}")
            return None
        
        inbox_settings = company_settings.settings.get("ia", {}).get("inbox", {})
        custom_prompt = inbox_settings.get("reply_prompt")
        
        if not custom_prompt or not custom_prompt.strip():
            logger.error(f"[AUTO REPLY] Aucun prompt configuré dans les paramètres de l'entreprise. Veuillez configurer le prompt dans les paramètres.")
            return None
        
        logger.info(f"[AUTO REPLY] Prompt récupéré depuis les paramètres: {repr(custom_prompt[:100])}...")
        
        # Si "Utiliser la base de connaissances" est activé, l'ajouter au prompt
        use_company_knowledge = auto_reply_config.get("useCompanyKnowledge", False)
        if use_company_knowledge:
            knowledge_base = inbox_settings.get("knowledge_base", "")
            if knowledge_base and knowledge_base.strip():
                custom_prompt = f"{custom_prompt}\n\nBase de connaissances de l'entreprise :\n{knowledge_base.strip()}"
                logger.info(f"[AUTO REPLY] Base de connaissances ajoutée au prompt ({len(knowledge_base)} caractères)")
            else:
                logger.warning(f"[AUTO REPLY] Base de connaissances activée mais vide dans les paramètres")
        
        # Générer la réponse avec l'IA
        client_name = conversation.client.name if conversation.client else None
        reply = ai_reply_service.generate_reply(
            conversation_messages=messages_data,
            client_name=client_name,
            custom_prompt=custom_prompt,
            base_message=None
        )
        
        if reply:
            logger.info(f"[AUTO REPLY] Réponse générée avec succès ({len(reply)} caractères)")
            return reply
        else:
            logger.error(f"[AUTO REPLY] Échec de la génération de la réponse")
            return None
            
    except Exception as e:
        logger.error(f"[AUTO REPLY] Erreur lors de la génération de la réponse: {e}", exc_info=True)
        return None


def process_auto_reply(
    db: Session,
    conversation: Conversation,
    folder: Optional[InboxFolder] = None
) -> Dict[str, Any]:
    """
    Traite la réponse automatique pour une conversation.
    
    Args:
        db: Session de base de données
        conversation: La conversation
        folder: Le dossier de la conversation (si existe, sinon récupéré depuis conversation.folder_id)
    
    Returns:
        Un dictionnaire avec les informations sur le traitement de la réponse automatique
    """
    try:
        # Récupérer le dossier si non fourni
        if not folder:
            if not conversation.folder_id:
                logger.warning(f"[AUTO REPLY] Aucun dossier trouvé pour la conversation {conversation.id}")
                return {"sent": False, "pending": False, "content": None}
            
                folder = db.query(InboxFolder).filter(
                InboxFolder.id == conversation.folder_id,
                InboxFolder.company_id == conversation.company_id
                ).first()
            logger.info(f"[AUTO REPLY] Dossier récupéré: {folder.id if folder else None}")
        
        if not folder:
            logger.warning(f"[AUTO REPLY] Aucun dossier trouvé pour la conversation {conversation.id}")
            return {"sent": False, "pending": False, "content": None}
        
        # Vérifier si une réponse automatique doit être envoyée
        if not should_send_auto_reply(db, conversation, folder):
            logger.info(f"[AUTO REPLY] Conditions non remplies pour la conversation {conversation.id}")
            return {"sent": False, "pending": False, "content": None}
        
        logger.info(f"[AUTO REPLY] ✅ Démarrage de la génération de la réponse pour conversation {conversation.id}")
        
        # Récupérer la configuration auto_reply
        auto_reply_config = folder.auto_reply or {}
        
        # Générer le contenu de la réponse
        reply_content = generate_auto_reply_content(
            db=db,
            conversation=conversation,
            folder=folder,
            auto_reply_config=auto_reply_config
        )
        
        if not reply_content:
            logger.error(f"[AUTO REPLY] Impossible de générer le contenu de la réponse pour la conversation {conversation.id}")
            return {"sent": False, "pending": False, "content": None}
        
        # Récupérer le mode et le délai
        mode = auto_reply_config.get("mode", "none")
        delay = auto_reply_config.get("delay", 0) or 0
        
        if mode == "auto":
            # Envoi automatique (après délai éventuel)
            if delay > 0:
                # Marquer comme en attente (sera envoyé plus tard)
                conversation.auto_reply_pending = True
                conversation.auto_reply_mode = "auto"
                conversation.pending_auto_reply_content = reply_content
                db.commit()
                logger.info(f"[AUTO REPLY] Réponse mise en attente (délai: {delay} minutes)")
                return {"sent": False, "pending": True, "content": reply_content}
            else:
                # Envoyer immédiatement
                send_success = _send_auto_reply_message(
                    db=db,
                    conversation=conversation,
                    reply_content=reply_content
                )
                
                if send_success:
                    # Ne pas mettre auto_reply_sent à True pour permettre plusieurs auto-réponses
                    # auto_reply_sent sera réinitialisé quand l'entreprise répond manuellement
                    conversation.auto_reply_mode = "auto"
                    conversation.auto_reply_pending = False
                    db.commit()
                    logger.info("[AUTO REPLY] Réponse envoyée automatiquement avec succès")
                    return {"sent": True, "pending": False, "content": reply_content}
                else:
                    # En cas d'échec, mettre en attente pour réessayer plus tard
                    conversation.auto_reply_pending = True
                    conversation.auto_reply_mode = "auto"
                    conversation.pending_auto_reply_content = reply_content
                    db.commit()
                    logger.warning("[AUTO REPLY] Échec de l'envoi, réponse mise en attente")
                    return {"sent": False, "pending": True, "content": reply_content}
        
        elif mode == "approval":
            # Mettre en attente de validation
            conversation.auto_reply_pending = True
            conversation.auto_reply_mode = "approval"
            # Stocker le contenu de la réponse dans la base de données
            conversation.pending_auto_reply_content = reply_content
            db.commit()
            logger.info(f"[AUTO REPLY] Réponse mise en attente de validation (contenu stocké: {len(reply_content)} caractères)")
            return {"sent": False, "pending": True, "content": reply_content}
        
        else:
            # Mode "none" ou autre
            return {"sent": False, "pending": False, "content": None}
            
    except Exception as e:
        logger.error(f"[AUTO REPLY] Erreur lors du traitement de la réponse automatique: {e}", exc_info=True)
        return {"sent": False, "pending": False, "content": None}


def _send_auto_reply_message(
    db: Session,
    conversation: Conversation,
    reply_content: str
) -> bool:
    """
    Envoie le message de réponse automatique (email ou SMS).
    
    Args:
        db: Session de base de données
        conversation: La conversation
        reply_content: Le contenu de la réponse à envoyer
    
    Returns:
        True si l'envoi a réussi, False sinon
    """
    try:
        if conversation.source == "email":
            # Récupérer la boîte mail principale pour l'envoi
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == conversation.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True
            ).first()
            
            if not primary_integration or not primary_integration.email_address or not primary_integration.email_password:
                logger.error("[AUTO REPLY] Aucune boîte mail principale configurée pour l'envoi")
                return False
            
            # Récupérer l'email du client
            first_client_message = db.query(InboxMessage).filter(
                InboxMessage.conversation_id == conversation.id,
                InboxMessage.is_from_client == True,
                InboxMessage.from_email.isnot(None)
            ).order_by(InboxMessage.created_at.asc()).first()
            
            if not first_client_message or not first_client_message.from_email:
                logger.error("[AUTO REPLY] Impossible de trouver l'email du client pour l'envoi")
                return False
            
            # Décrypter le mot de passe
            encryption_service = get_encryption_service()
            email_password = encryption_service.decrypt(primary_integration.email_password) if primary_integration.email_password else None
            
            if not email_password:
                logger.error("[AUTO REPLY] Impossible de décrypter le mot de passe de la boîte mail")
                return False
            
            # Récupérer la configuration SMTP à partir de l'adresse email
            smtp_config = get_smtp_config(primary_integration.email_address)
            
            # Envoyer l'email
            success = send_email_smtp(
                smtp_server=smtp_config["smtp_server"],
                smtp_port=smtp_config["smtp_port"],
                email_address=primary_integration.email_address,
                password=email_password,
                to_email=first_client_message.from_email,
                subject=f"Re: {conversation.subject or 'Votre message'}" if conversation.subject else "Re: Votre message",
                content=reply_content,
                use_tls=smtp_config["use_tls"],
                attachments=None,
                from_name=None  # Utiliser le nom par défaut de l'email
            )
            
            if success:
                # Créer un message dans la conversation pour enregistrer la réponse
                auto_message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=primary_integration.email_address.split("@")[0] or "Auto-Reply",
                    from_email=primary_integration.email_address,
                    content=reply_content,
                    source="email",
                    is_from_client=False,
                    read=True
                )
                db.add(auto_message)
                # Mettre à jour la date du dernier message
                conversation.last_message_at = datetime.now()
                db.commit()
                db.refresh(auto_message)
                db.refresh(conversation)
                logger.info(f"[AUTO REPLY] Message enregistré dans la conversation (ID: {auto_message.id})")
            
            return success
            
        elif conversation.source == "sms":
            # Récupérer l'intégration SMS active
            sms_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == conversation.company_id,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "sms"
            ).first()
            
            if not sms_integration or not sms_integration.api_key or not sms_integration.webhook_secret:
                logger.error("[AUTO REPLY] Aucune intégration SMS configurée pour l'envoi")
                return False
            
            # Récupérer le numéro de téléphone du client
            first_client_message = db.query(InboxMessage).filter(
                InboxMessage.conversation_id == conversation.id,
                InboxMessage.is_from_client == True,
                InboxMessage.from_phone.isnot(None)
            ).order_by(InboxMessage.created_at.asc()).first()
            
            if not first_client_message or not first_client_message.from_phone:
                logger.error("[AUTO REPLY] Impossible de trouver le numéro de téléphone du client pour l'envoi")
                return False
            
            # Décrypter les clés API
            encryption_service = get_encryption_service()
            api_key = encryption_service.decrypt(sms_integration.api_key) if sms_integration.api_key else None
            api_secret = encryption_service.decrypt(sms_integration.webhook_secret) if sms_integration.webhook_secret else None
            
            if not api_key or not api_secret:
                logger.error("[AUTO REPLY] Impossible de décrypter les clés API SMS")
                return False
            
            # Envoyer le SMS via Vonage
            sms_service = VonageSMSService(api_key=api_key, api_secret=api_secret)
            result = sms_service.send_sms(
                to=first_client_message.from_phone,
                message=reply_content,
                from_number=sms_integration.phone_number
            )
            
            if result.get("success"):
                # Créer un message dans la conversation pour enregistrer la réponse
                auto_message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=sms_integration.phone_number or "Auto-Reply",
                    from_phone=sms_integration.phone_number,
                    content=reply_content,
                    source="sms",
                    is_from_client=False,
                    read=True
                )
                db.add(auto_message)
                # Mettre à jour la date du dernier message
                conversation.last_message_at = datetime.now()
                db.commit()
                db.refresh(auto_message)
                db.refresh(conversation)
                logger.info(f"[AUTO REPLY] Message SMS enregistré dans la conversation (ID: {auto_message.id})")
            
            return result.get("success", False)
        
        else:
            logger.warning(f"[AUTO REPLY] Source de conversation non supportée pour l'envoi automatique: {conversation.source}")
            return False
            
    except Exception as e:
        logger.error(f"[AUTO REPLY] Erreur lors de l'envoi du message automatique: {e}", exc_info=True)
        return False


def trigger_auto_reply_if_needed(
    db: Session,
    conversation: Conversation,
    message: InboxMessage
) -> None:
    """
    Déclenche l'auto-réponse si nécessaire après qu'un message entre dans un dossier.
    Cette fonction doit être appelée après qu'un dossier soit assigné à une conversation.
    
    Args:
        db: Session de base de données
        conversation: La conversation
        message: Le message qui vient d'être ajouté
    """
    # Vérifier que la conversation est dans un dossier et que le message vient du client
    if not conversation.folder_id or not message.is_from_client:
        return
    
    # Récupérer le dossier
    folder = db.query(InboxFolder).filter(
        InboxFolder.id == conversation.folder_id,
        InboxFolder.company_id == conversation.company_id
    ).first()
    
    if not folder:
        return
    
    # Vérifier que l'auto-réponse est activée
    auto_reply_config = folder.auto_reply or {}
    if not auto_reply_config.get("enabled", False):
        return
    
    # Déclencher l'auto-réponse
    logger.info(f"[AUTO REPLY] Déclenchement auto-réponse pour conversation {conversation.id} dans dossier {folder.name}")
    result = process_auto_reply(db, conversation, folder)
    logger.info(f"[AUTO REPLY] Résultat: {result}")
    db.refresh(conversation)
    db.expire(conversation, ['messages'])
