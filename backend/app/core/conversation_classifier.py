"""
Service de classification automatique des conversations.
"""
from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.models.conversation import Conversation, InboxMessage


def detect_urgent(subject: str, content: str) -> Tuple[bool, float]:
    """
    Détecte si un message est urgent basé sur les mots-clés.
    
    Returns:
        (is_urgent, confidence) où confidence est entre 0.0 et 1.0
    """
    text_to_check = f"{subject} {content}".lower()
    
    # Mots-clés d'urgence avec leur poids
    urgent_keywords = {
        "urgent": 1.0,
        "urgente": 1.0,
        "asap": 0.9,
        "immédiat": 0.9,
        "immédiatement": 0.9,
        "prioritaire": 0.8,
        "important": 0.7,
        "rapidement": 0.7,
        "dès que possible": 0.8,
        "au plus vite": 0.8,
        "urgent!": 1.0,
        "urgent!!": 1.0,
        "urgent!!!": 1.0,
    }
    
    # Vérifier les mots en majuscules (URGENT, URGENT!!!)
    if subject:
        upper_count = sum(1 for c in subject if c.isupper())
        if len(subject) > 0 and upper_count / len(subject) > 0.5:
            # Plus de 50% en majuscules = probablement urgent
            return (True, 0.8)
    
    # Chercher les mots-clés
    max_confidence = 0.0
    for keyword, weight in urgent_keywords.items():
        if keyword in text_to_check:
            max_confidence = max(max_confidence, weight)
    
    # Si plusieurs mots-clés, augmenter la confiance
    found_keywords = sum(1 for keyword in urgent_keywords.keys() if keyword in text_to_check)
    if found_keywords > 1:
        max_confidence = min(1.0, max_confidence + 0.2)
    
    # Si au moins un mot-clé urgent trouvé, retourner True
    # Réduire le seuil pour être plus permissif
    return (max_confidence > 0.3, max_confidence)


def auto_classify_conversation_status(
    db: Session,
    conversation: Conversation,
    last_message: Optional[InboxMessage] = None
) -> str:
    """
    Classe automatiquement le statut d'une conversation basé sur son état actuel.
    
    Règles:
    - "Urgent": Si le dernier message contient des mots-clés d'urgence
    - "Répondu": Si le dernier message vient de l'entreprise
    - "En attente": Si dernier message du client il y a > 24h et en attente de réponse
    - "À répondre": Nouveau message du client (< 24h)
    - "Résolu": Aucun nouveau message depuis > 7 jours et statut Répondu
    """
    if not last_message:
        # Récupérer le dernier message
        last_message = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conversation.id
        ).order_by(InboxMessage.created_at.desc()).first()
    
    if not last_message:
        # Pas de message, garder le statut actuel
        return conversation.status
    
    # Ne pas modifier si le statut est manuel (Archivé, Spam)
    if conversation.status in ["Archivé", "Spam"]:
        return conversation.status
    
    now = datetime.utcnow()
    last_message_age = (now - last_message.created_at.replace(tzinfo=None)).total_seconds() / 3600  # En heures
    
    # Si le dernier message vient de l'entreprise -> "Répondu"
    if not last_message.is_from_client:
        # Si c'est une réponse récente (< 48h), mettre "Répondu"
        if last_message_age < 48:
            return "Répondu"
        # Si réponse ancienne (> 7 jours sans nouveau message), "Résolu"
        elif last_message_age > 24 * 7:
            return "Résolu"
        else:
            # Réponse entre 48h et 7 jours, garder "Répondu"
            return "Répondu"
    
    # 3. Si le dernier message vient du client
    if last_message.is_from_client:
        # Si très récent (< 24h) -> "À répondre"
        if last_message_age < 24:
            return "À répondre"
        
        # Si ancien (> 24h) et qu'on attend toujours une réponse -> "En attente"
        # Vérifier si l'entreprise a déjà répondu dans cette conversation
        has_company_response = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conversation.id,
            InboxMessage.is_from_client == False
        ).first() is not None
        
        if has_company_response:
            # L'entreprise a déjà répondu, donc on attend la réponse du client
            # Si > 7 jours sans réponse, considérer comme "Résolu"
            if last_message_age > 24 * 7:
                return "Résolu"
            else:
                return "En attente"
        else:
            # Pas encore de réponse de l'entreprise
            if last_message_age < 24:
                return "À répondre"
            else:
                return "En attente"
    
    # Par défaut, garder le statut actuel
    return conversation.status


def update_conversation_status_auto(
    db: Session,
    conversation_id: int
) -> Optional[str]:
    """
    Met à jour automatiquement le statut d'une conversation.
    Retourne le nouveau statut ou None si pas de changement.
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        return None
    
    old_status = conversation.status
    new_status = auto_classify_conversation_status(db, conversation)
    
    if new_status != old_status:
        conversation.status = new_status
        db.commit()
        print(f"[CLASSIFY] Conversation {conversation_id} : {old_status} -> {new_status}")
        return new_status
    
    return None

