#!/usr/bin/env python3
"""
Script de synchronisation périodique des emails.
À exécuter via cron toutes les minutes (ou selon vos besoins).

Usage:
    python scripts/sync_emails_periodic.py

Pour cron (toutes les minutes):
    * * * * * cd /path/to/backend && python scripts/sync_emails_periodic.py >> logs/email_sync.log 2>&1
"""
import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.inbox_integration import InboxIntegration
from app.db.models.company import Company
from app.core.imap_service import fetch_emails_async, get_message_ids_from_imap_async
from app.api.routes.inbox_integrations import (
    normalize_message_id,
    normalize_subject,
    find_conversation_from_reply,
    is_duplicate_message,
    detect_newsletter_or_spam,
    get_or_create_spam_folder
)
from app.core.conversation_classifier import auto_classify_conversation_status
from app.core.folder_ai_classifier import classify_conversation_to_folder
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder, MessageAttachment
from app.db.models.client import Client
from datetime import datetime
from pathlib import Path
import uuid
from app.core.config import settings
from app.core.encryption_service import get_encryption_service
import asyncio
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Répertoire de stockage des fichiers
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


async def sync_integration(integration: InboxIntegration, db):
    """Synchronise une intégration IMAP spécifique."""
    try:
        logger.info(f"[SYNC PERIODIC] Synchronisation de {integration.email_address} (ID: {integration.id})")
        
        # Récupérer la company
        company = db.query(Company).filter(Company.id == integration.company_id).first()
        if not company:
            logger.error(f"[SYNC PERIODIC] Company {integration.company_id} non trouvée")
            return {"processed": 0, "created": 0, "errors": 0, "skipped": 0}
        
        # Créer les dossiers par défaut s'ils n'existent pas
        try:
            from app.api.routes.inbox_integrations import create_default_folders
            created_folders = create_default_folders(db, company.id)
            if created_folders > 0:
                logger.info(f"[SYNC PERIODIC] {created_folders} dossier(s) par défaut créé(s) pour l'entreprise {company.id}")
        except Exception as e:
            logger.warning(f"[SYNC PERIODIC] Erreur lors de la création des dossiers par défaut: {e}")
            # Continuer même si la création des dossiers échoue
        
        # Déchiffrer le mot de passe avant utilisation
        encryption_service = get_encryption_service()
        decrypted_password = encryption_service.decrypt(integration.email_password) if integration.email_password else None
        
        # Récupérer les emails depuis IMAP
        emails = await fetch_emails_async(
            imap_server=integration.imap_server,
            imap_port=integration.imap_port or 993,
            email_address=integration.email_address,
            password=decrypted_password,
            company_code=company.code,
            use_ssl=integration.use_ssl if integration.use_ssl is not None else True
        )
        
        logger.info(f"[SYNC PERIODIC] {len(emails)} email(s) récupéré(s)")
        
        stats = {"processed": 0, "created": 0, "errors": 0, "skipped": 0}
        
        # Traiter chaque email (même logique que inbox_integrations.py)
        for email_data in emails:
            try:
                # Vérifier les doublons
                message_id = email_data.get("message_id")
                from_email = email_data.get("from", {}).get("email")
                content = email_data.get("content", "")
                email_date_str = email_data.get("date")
                email_date = None
                
                if email_date_str:
                    try:
                        email_date = datetime.fromisoformat(email_date_str.replace('Z', '+00:00'))
                    except:
                        try:
                            email_date = datetime.fromisoformat(email_date_str)
                        except:
                            pass
                
                if is_duplicate_message(db, company.id, message_id, from_email, content, email_date):
                    logger.debug(f"[SYNC PERIODIC] Email ignoré (doublon): {email_data.get('subject', 'Sans sujet')[:50]} de {from_email}")
                    stats["skipped"] += 1
                    continue
                
                # Détecter newsletters/spam
                is_filtered, filter_reason = detect_newsletter_or_spam(email_data)
                if is_filtered:
                    logger.info(f"[SYNC PERIODIC] Email filtré comme {filter_reason}: {email_data.get('subject', 'Sans sujet')[:50]} de {from_email}")
                    stats["skipped"] += 1
                    continue
                
                # Identifier ou créer le client
                client = None
                if from_email:
                    client = db.query(Client).filter(
                        Client.company_id == company.id,
                        Client.email == from_email
                    ).first()
                    
                    if not client:
                        client = Client(
                            company_id=company.id,
                            name=email_data.get("from", {}).get("name", from_email.split("@")[0]),
                            email=from_email,
                            type="Client"
                        )
                        db.add(client)
                        db.flush()
                
                # Chercher ou créer une conversation
                subject = email_data.get("subject", "")
                normalized_subject = normalize_subject(subject) if subject else ""
                
                in_reply_to = email_data.get("in_reply_to")
                references = email_data.get("references", [])
                
                conversation = None
                
                # Chercher via In-Reply-To ou References
                if in_reply_to or references:
                    conversation = find_conversation_from_reply(
                        db, company.id, in_reply_to, references, normalized_subject, from_email
                    )
                
                # Sinon chercher par sujet
                if not conversation:
                    if normalized_subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == normalized_subject
                        ).first()
                    
                    if not conversation and subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == subject
                        ).first()
                
                # Créer une nouvelle conversation si nécessaire
                conversation_subject = normalized_subject if normalized_subject else subject
                if not conversation:
                    conversation = Conversation(
                        company_id=company.id,
                        client_id=client.id if client else None,
                        subject=conversation_subject,
                        status="À répondre",
                        source="email",
                        unread_count=1,
                        last_message_at=datetime.utcnow(),
                    )
                    db.add(conversation)
                    db.flush()
                    logger.info(f"[SYNC PERIODIC] ✅ Nouvelle conversation créée: ID={conversation.id}")
                
                # Créer le message
                normalized_message_id = normalize_message_id(message_id) if message_id else None
                message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=email_data.get("from", {}).get("name", from_email or "Inconnu"),
                    from_email=from_email,
                    content=content,
                    source="email",
                    is_from_client=True,
                    read=False,
                    external_id=normalized_message_id,
                    external_metadata={
                        "to": email_data.get("to"),
                        "imap_uid": email_data.get("imap_uid"),
                        "integration_id": integration.id,
                    }
                )
                db.add(message)
                db.flush()
                
                # Traiter les pièces jointes
                attachments_data = email_data.get("attachments", [])
                if attachments_data:
                    company_upload_dir = UPLOAD_DIR / str(company.id)
                    company_upload_dir.mkdir(parents=True, exist_ok=True)
                    
                    for att_data in attachments_data:
                        if not att_data.get("content"):
                            continue
                        
                        filename = att_data.get("filename", "attachment")
                        file_type = get_file_type(filename)
                        unique_filename = f"{uuid.uuid4()}_{filename}"
                        file_path = company_upload_dir / unique_filename
                        
                        with open(file_path, "wb") as f:
                            f.write(att_data["content"])
                        
                        attachment = MessageAttachment(
                            message_id=message.id,
                            name=filename,
                            file_type=file_type,
                            file_path=str(file_path.relative_to(UPLOAD_DIR)),
                            file_size=len(att_data["content"]),
                            mime_type=att_data.get("mime_type")
                        )
                        db.add(attachment)
                
                # Classification automatique
                conversation.status = auto_classify_conversation_status(db, conversation, message)
                
                # Classification dans un dossier
                old_folder_id = conversation.folder_id
                folder_id = classify_conversation_to_folder(
                    db=db,
                    conversation=conversation,
                    message=message,
                    company_id=company.id
                )
                if folder_id:
                    conversation.folder_id = folder_id
                
                db.commit()
                stats["created"] += 1
                stats["processed"] += 1
                
                # Traiter la réponse automatique si configurée
                # IMPORTANT: Déclencher l'auto-réponse dès qu'un message entre dans un dossier avec auto-réponse activée
                if conversation.folder_id and message.is_from_client:
                    from app.core.auto_reply_service import trigger_auto_reply_if_needed
                    trigger_auto_reply_if_needed(db, conversation, message)
                
            except Exception as e:
                db.rollback()
                stats["errors"] += 1
                logger.error(f"[SYNC PERIODIC] Erreur lors du traitement d'un email: {e}", exc_info=True)
        
        logger.info(f"[SYNC PERIODIC] ✅ Synchronisation terminée: {stats['created']} créé(s), {stats['skipped']} ignoré(s), {stats['errors']} erreur(s)")
        return stats
        
    except Exception as e:
        logger.error(f"[SYNC PERIODIC] Erreur lors de la synchronisation: {e}", exc_info=True)
        return {"processed": 0, "created": 0, "errors": 1, "skipped": 0}


async def sync_all_integrations():
    """Synchronise toutes les intégrations IMAP actives."""
    db = SessionLocal()
    try:
        logger.info("[SYNC PERIODIC] 🔄 Démarrage de la synchronisation périodique")
        
        # Récupérer toutes les intégrations IMAP actives
        integrations = db.query(InboxIntegration).filter(
            InboxIntegration.integration_type == "imap",
            InboxIntegration.is_active == True
        ).all()
        
        logger.info(f"[SYNC PERIODIC] {len(integrations)} intégration(s) IMAP active(s)")
        
        total_stats = {"processed": 0, "created": 0, "errors": 0, "skipped": 0}
        
        for integration in integrations:
            stats = await sync_integration(integration, db)
            total_stats["processed"] += stats["processed"]
            total_stats["created"] += stats["created"]
            total_stats["errors"] += stats["errors"]
            total_stats["skipped"] += stats["skipped"]
        
        logger.info(f"[SYNC PERIODIC] ✅ Synchronisation globale terminée: {total_stats['created']} conversation(s) créée(s)")
        
        # Reclassifier les conversations sans dossier après la synchronisation
        # Cela permet de classer les conversations dans les bons dossiers même si les dossiers ont été créés/modifiés après
        logger.info(f"[SYNC PERIODIC] Reclassification des conversations sans dossier...")
        try:
            from app.core.folder_ai_classifier import reclassify_all_conversations
            from app.core.auto_reply_service import trigger_auto_reply_if_needed
            from datetime import timedelta
            
            # Reclassifier pour toutes les entreprises qui ont des intégrations actives
            companies_with_integrations = db.query(Company).join(InboxIntegration).filter(
                InboxIntegration.integration_type == "imap",
                InboxIntegration.is_active == True
            ).distinct().all()
            
            total_classified = 0
            total_auto_reply = 0
            
            for company in companies_with_integrations:
                stats = reclassify_all_conversations(db=db, company_id=company.id, force=False)
                classified_count = stats.get('classified', 0)
                total_classified += classified_count
                
                if classified_count > 0:
                    logger.info(f"[SYNC PERIODIC] {classified_count} conversation(s) classée(s) pour l'entreprise {company.id}")
                    
                    # Déclencher l'auto-réponse pour les conversations nouvellement classées
                    recently_classified = db.query(Conversation).filter(
                        Conversation.company_id == company.id,
                        Conversation.folder_id.isnot(None),
                        Conversation.updated_at >= datetime.utcnow() - timedelta(minutes=5)
                    ).all()
                    
                    for conv in recently_classified:
                        last_message = db.query(InboxMessage).filter(
                            InboxMessage.conversation_id == conv.id,
                            InboxMessage.is_from_client == True
                        ).order_by(InboxMessage.created_at.desc()).first()
                        
                        if last_message:
                            trigger_auto_reply_if_needed(db, conv, last_message)
                            total_auto_reply += 1
            
            logger.info(f"[SYNC PERIODIC] Reclassification terminée: {total_classified} conversation(s) classée(s), {total_auto_reply} auto-réponse(s) déclenchée(s)")
        except Exception as e:
            logger.error(f"[SYNC PERIODIC] Erreur lors de la reclassification: {e}", exc_info=True)
            # Ne pas faire échouer la synchronisation si la reclassification échoue
        
    except Exception as e:
        logger.error(f"[SYNC PERIODIC] ❌ Erreur globale: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(sync_all_integrations())

