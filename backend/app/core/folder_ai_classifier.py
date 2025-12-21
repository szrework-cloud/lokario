"""
Service pour classifier automatiquement les conversations dans les dossiers
en utilisant l'IA (GPT-4o-mini) pour une meilleure précision.
"""
import logging
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.ai_classifier_service import AIClassifierService

logger = logging.getLogger(__name__)

# Instance globale du service IA (singleton)
_ai_classifier_service = None


def get_ai_classifier_service() -> Optional[AIClassifierService]:
    """Retourne l'instance du service IA (singleton)."""
    global _ai_classifier_service
    if _ai_classifier_service is None:
        _ai_classifier_service = AIClassifierService()
    return _ai_classifier_service


def classify_conversation_to_folder(
    db: Session,
    conversation: Conversation,
    message: InboxMessage,
    company_id: int
) -> Optional[int]:
    """
    Classe automatiquement une conversation dans un dossier en utilisant l'IA.
    
    Args:
        db: Session de base de données
        conversation: La conversation à classer
        message: Le message à analyser (généralement le dernier message)
        company_id: ID de l'entreprise
    
    Returns:
        L'ID du dossier approprié, ou None si aucun dossier ne correspond
    """
    try:
        # Récupérer le service IA
        ai_service = get_ai_classifier_service()
        if not ai_service or not ai_service.enabled:
            logger.debug("[AI CLASSIFIER] Service IA non disponible, message non classé")
            return None
        
        # Récupérer les dossiers avec autoClassify activé
        all_folders = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id
        ).all()
        
        folders_with_ai = []
        for folder in all_folders:
            filters = folder.ai_rules or {}
            if isinstance(filters, dict) and filters.get("autoClassify", False):
                folders_with_ai.append({
                    "id": folder.id,
                    "name": folder.name,
                    "folder_type": getattr(folder, "folder_type", "general"),
                    "ai_rules": filters
                })
        
        if not folders_with_ai:
            logger.debug("[AI CLASSIFIER] Aucun dossier avec autoClassify activé")
            return None
        
        # Préparer les données pour l'IA
        message_content = (message.content or "")[:500]  # Tronquer à 500 caractères pour économiser
        message_subject = conversation.subject or "" if conversation.source == "email" else ""
        message_from = message.from_email or message.from_phone or ""
        
        # Appeler l'IA pour classifier
        folder_id = ai_service.classify_message_to_folder(
            message_content=message_content,
            message_subject=message_subject,
            message_from=message_from,
            folders=folders_with_ai,
            company_context=None
        )
        
        if folder_id:
            folder_name = next((f["name"] for f in folders_with_ai if f["id"] == folder_id), "Inconnu")
            logger.info(f"[AI CLASSIFIER] Message classé dans le dossier '{folder_name}' (ID: {folder_id})")
        else:
            logger.debug("[AI CLASSIFIER] Aucun dossier trouvé par l'IA")
        
        return folder_id
        
    except Exception as e:
        logger.error(f"[AI CLASSIFIER] Erreur lors de la classification: {e}")
        import traceback
        traceback.print_exc()
        return None


def reclassify_all_conversations(db: Session, company_id: int, force: bool = False, batch_size: int = 10) -> dict:
    """
    Reclasse toutes les conversations d'une entreprise en utilisant l'IA (avec batch processing).
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        force: Si True, reclasse même les conversations déjà dans un dossier
        batch_size: Nombre de conversations à traiter par batch (réduit les coûts)
    
    Returns:
        Dict avec les statistiques de classification (classées, non_classées, erreurs)
    """
    stats = {
        "total": 0,
        "classified": 0,
        "not_classified": 0,
        "errors": 0
    }
    
    try:
        logger.info(f"[AI CLASSIFIER] Début de la reclassification IA pour l'entreprise {company_id}")
        
        # Récupérer le service IA
        ai_service = get_ai_classifier_service()
        if not ai_service or not ai_service.enabled:
            logger.warning("[AI CLASSIFIER] Service IA non disponible, reclassification ignorée")
            return stats
        
        # Récupérer toutes les conversations
        query = db.query(Conversation).filter(Conversation.company_id == company_id)
        if not force:
            query = query.filter(Conversation.folder_id.is_(None))
        
        conversations = query.all()
        stats["total"] = len(conversations)
        
        if stats["total"] == 0:
            return stats
        
        logger.info(f"[AI CLASSIFIER] {stats['total']} conversation(s) à reclasser")
        
        # Récupérer les dossiers avec autoClassify activé
        all_folders = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id
        ).all()
        
        folders_with_ai = []
        for folder in all_folders:
            filters = folder.ai_rules or {}
            if isinstance(filters, dict) and filters.get("autoClassify", False):
                folders_with_ai.append({
                    "id": folder.id,
                    "name": folder.name,
                    "folder_type": getattr(folder, "folder_type", "general"),
                    "ai_rules": filters
                })
        
        if not folders_with_ai:
            logger.debug("[AI CLASSIFIER] Aucun dossier avec autoClassify activé")
            return stats
        
        # Traiter par batch pour optimiser les coûts
        for i in range(0, len(conversations), batch_size):
            batch = conversations[i:i + batch_size]
            
            # Préparer les messages pour l'IA
            messages_data = []
            for conversation in batch:
                # Récupérer le premier message client (plus fiable pour l'expéditeur)
                first_client_message = db.query(InboxMessage).filter(
                    InboxMessage.conversation_id == conversation.id,
                    InboxMessage.is_from_client == True
                ).order_by(InboxMessage.created_at.asc()).first()
                
                # Si pas de message client, prendre le dernier message
                if not first_client_message:
                    first_client_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conversation.id
                    ).order_by(InboxMessage.created_at.desc()).first()
                
                if not first_client_message:
                    continue
                
                # Utiliser l'expéditeur du premier message client (plus fiable)
                from_email = first_client_message.from_email or ""
                from_phone = first_client_message.from_phone or ""
                
                messages_data.append({
                    "conversation_id": conversation.id,
                    "content": (first_client_message.content or "")[:500],  # Tronquer pour économiser
                    "subject": conversation.subject or "" if conversation.source == "email" else "",
                    "from_email": from_email,
                    "from_phone": from_phone
                })
            
            if not messages_data:
                continue
            
            try:
                # Appel IA batch (plus économique que plusieurs appels individuels)
                batch_results = ai_service.classify_messages_batch(
                    messages=messages_data,
                    folders=folders_with_ai,
                    company_context=None
                )
                
                # Appliquer les résultats
                for conversation_id, folder_id in batch_results.items():
                    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                    if conversation and folder_id:
                        conversation.folder_id = folder_id
                        stats["classified"] += 1
                        logger.debug(f"[AI CLASSIFIER] Conversation {conversation_id} classée dans le dossier {folder_id}")
                    elif conversation:
                        stats["not_classified"] += 1
                
                db.commit()
                logger.info(f"[AI CLASSIFIER] Batch {i//batch_size + 1}: {len(batch_results)} conversation(s) traitée(s)")
                
            except Exception as e:
                db.rollback()
                logger.error(f"[AI CLASSIFIER] Erreur lors du traitement batch: {e}")
                stats["errors"] += len(messages_data)
                import traceback
                traceback.print_exc()
        
        stats["not_classified"] = stats["total"] - stats["classified"] - stats["errors"]
        
        logger.info(
            f"[AI CLASSIFIER] Reclassification terminée: "
            f"{stats['classified']} classée(s), {stats['not_classified']} non classée(s), {stats['errors']} erreur(s)"
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"[AI CLASSIFIER] Erreur lors de la reclassification: {e}")
        import traceback
        traceback.print_exc()
        stats["errors"] = stats["total"]
        return stats

