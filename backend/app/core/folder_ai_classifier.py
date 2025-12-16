"""
Service pour classifier automatiquement les conversations dans les dossiers
en utilisant des filtres basés sur des règles (mots-clés, expéditeurs, etc.).
"""
import logging
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.folder_filter_service import classify_conversation_with_filters

logger = logging.getLogger(__name__)


def classify_conversation_to_folder(
    db: Session,
    conversation: Conversation,
    message: InboxMessage,
    company_id: int
) -> Optional[int]:
    """
    Classe automatiquement une conversation dans un dossier en utilisant des filtres basés sur des règles.
    
    Args:
        db: Session de base de données
        conversation: La conversation à classer
        message: Le message à analyser (généralement le dernier message)
        company_id: ID de l'entreprise
    
    Returns:
        L'ID du dossier approprié, ou None si aucun dossier ne correspond
    """
    # Utiliser le service de filtres au lieu de l'IA
    return classify_conversation_with_filters(
        db=db,
        conversation=conversation,
        message=message,
        company_id=company_id
    )


def reclassify_all_conversations(db: Session, company_id: int, force: bool = False) -> dict:
    """
    Reclasse toutes les conversations d'une entreprise en utilisant des filtres basés sur des règles.
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        force: Si True, reclasse même les conversations déjà dans un dossier
    
    Returns:
        Dict avec les statistiques de classification (classées, non_classées, erreurs)
    """
    from app.core.folder_filter_service import reclassify_all_conversations_with_filters
    
    # Utiliser le service de filtres au lieu de l'IA
    return reclassify_all_conversations_with_filters(
        db=db,
        company_id=company_id,
        force=force
    )

