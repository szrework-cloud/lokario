"""
Fonctions utilitaires pour créer des notifications
"""
from sqlalchemy.orm import Session
from app.db.models.notification import Notification, NotificationType
from typing import Optional


def create_notification(
    db: Session,
    company_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    link_url: Optional[str] = None,
    link_text: Optional[str] = None,
    source_type: Optional[str] = None,
    source_id: Optional[int] = None,
    user_id: Optional[int] = None,  # Si None, notification pour toute l'entreprise
) -> Notification:
    """
    Crée une notification dans la base de données
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        notification_type: Type de notification (FOLLOWUP_COMPLETED, QUOTE_SIGNED, etc.)
        title: Titre de la notification
        message: Message de la notification
        link_url: URL optionnelle vers l'élément concerné
        link_text: Texte du lien optionnel
        source_type: Type de source ("quote", "invoice", "followup")
        source_id: ID de l'élément source
        user_id: ID de l'utilisateur (None = tous les utilisateurs de l'entreprise)
    
    Returns:
        Notification créée
    """
    notification = Notification(
        company_id=company_id,
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        link_url=link_url,
        link_text=link_text,
        source_type=source_type,
        source_id=source_id,
        read=False,
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

