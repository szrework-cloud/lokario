"""
Service pour classifier automatiquement les conversations dans les dossiers
en utilisant des filtres basés sur des règles (mots-clés, expéditeurs, etc.).
"""
import logging
import re
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder

logger = logging.getLogger(__name__)


def classify_conversation_with_filters(
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
    try:
        # Récupérer tous les dossiers (système et non-système) avec autoClassify activé
        all_folders = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id
        ).all()
        
        # Filtrer uniquement les dossiers avec autoClassify activé
        folders = []
        for folder in all_folders:
            filters = folder.ai_rules or {}
            if isinstance(filters, dict) and filters.get("autoClassify", False):
                folders.append(folder)
        
        if not folders:
            logger.debug("Aucun dossier avec autoClassify activé trouvé pour la classification")
            return None
        
        # Extraire les données du message
        message_content = (message.content or "").lower()
        message_subject = (conversation.subject or "").lower() if conversation.source == "email" else ""
        message_from_email = (message.from_email or "").lower()
        message_from_phone = message.from_phone or ""
        from_domain = ""
        if message_from_email and "@" in message_from_email:
            from_domain = message_from_email.split("@")[-1].lower()
        
        # Trier les dossiers par priorité (ordre de création ou priorité définie)
        folders_with_priority = []
        for folder in folders:
            filters = folder.ai_rules or {}
            if isinstance(filters, dict) and filters.get("autoClassify", False):
                priority = filters.get("priority", 999)  # Plus petit = plus prioritaire
                folders_with_priority.append((priority, folder))
        
        # Trier par priorité
        folders_with_priority.sort(key=lambda x: x[0])
        
        # Tester chaque dossier dans l'ordre de priorité
        for priority, folder in folders_with_priority:
            filters = folder.ai_rules or {}
            
            if not isinstance(filters, dict):
                continue
            
            # Récupérer les règles de filtrage
            filter_rules = filters.get("filters", {})
            if not filter_rules:
                continue
            
            # Tester les conditions
            matches = _test_filter_rules(
                message_content=message_content,
                message_subject=message_subject,
                message_from_email=message_from_email,
                message_from_phone=message_from_phone,
                from_domain=from_domain,
                filter_rules=filter_rules
            )
            
            if matches:
                folder_name = folder.name
                logger.info(f"[FOLDER FILTER] Message classé automatiquement dans le dossier '{folder_name}' (ID: {folder.id}) via filtres")
                return folder.id
        
        logger.debug("[FOLDER FILTER] Aucun dossier ne correspond aux filtres")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors de la classification par filtres: {e}")
        import traceback
        traceback.print_exc()
        return None


def _test_filter_rules(
    message_content: str,
    message_subject: str,
    message_from_email: str,
    message_from_phone: str,
    from_domain: str,
    filter_rules: Dict
) -> bool:
    """
    Teste si un message correspond aux règles de filtrage.
    
    Structure attendue pour filter_rules:
    {
        "keywords": ["mot1", "mot2"],  # Mots-clés à chercher
        "keywords_location": "any",  # "subject", "content", "any"
        "sender_email": ["email1@example.com", "email2@example.com"],  # Emails spécifiques
        "sender_domain": ["example.com", "domain.com"],  # Domaines
        "sender_phone": ["+33612345678"],  # Numéros de téléphone
        "match_type": "all",  # "all" (ET) ou "any" (OU)
    }
    
    Returns:
        True si le message correspond aux règles, False sinon
    """
    if not filter_rules:
        return False
    
    match_type = filter_rules.get("match_type", "any")  # "all" ou "any"
    conditions_met = []
    
    # Test 1: Mots-clés
    keywords = filter_rules.get("keywords", [])
    if keywords:
        keywords_location = filter_rules.get("keywords_location", "any")  # "subject", "content", "any"
        text_to_search = ""
        
        if keywords_location == "subject":
            text_to_search = message_subject
        elif keywords_location == "content":
            text_to_search = message_content
        else:  # "any"
            text_to_search = f"{message_subject} {message_content}"
        
        # Vérifier si au moins un mot-clé est présent (recherche insensible à la casse)
        found_keywords = []
        for keyword in keywords:
            if keyword and keyword.lower() in text_to_search:
                found_keywords.append(keyword)
        
        if match_type == "all":
            # Tous les mots-clés doivent être présents
            conditions_met.append(len(found_keywords) == len(keywords))
        else:
            # Au moins un mot-clé doit être présent
            conditions_met.append(len(found_keywords) > 0)
    
    # Test 2: Emails expéditeurs spécifiques
    sender_emails = filter_rules.get("sender_email", [])
    if sender_emails:
        if match_type == "all":
            # Tous les emails doivent correspondre (peu probable, mais possible)
            all_match = all(email.lower() in message_from_email for email in sender_emails if email)
            conditions_met.append(all_match)
        else:
            # Au moins un email doit correspondre
            any_match = any(email.lower() in message_from_email for email in sender_emails if email)
            conditions_met.append(any_match)
    
    # Test 3: Domaines expéditeurs
    sender_domains = filter_rules.get("sender_domain", [])
    if sender_domains:
        if match_type == "all":
            # Tous les domaines doivent correspondre
            all_match = all(domain.lower() == from_domain for domain in sender_domains if domain)
            conditions_met.append(all_match)
        else:
            # Au moins un domaine doit correspondre
            any_match = any(domain.lower() == from_domain for domain in sender_domains if domain)
            conditions_met.append(any_match)
    
    # Test 4: Numéros de téléphone
    sender_phones = filter_rules.get("sender_phone", [])
    if sender_phones:
        # Normaliser les numéros pour comparaison
        normalized_message_phone = _normalize_phone(message_from_phone)
        normalized_rule_phones = [_normalize_phone(phone) for phone in sender_phones if phone]
        
        if match_type == "all":
            all_match = all(phone in normalized_message_phone for phone in normalized_rule_phones)
            conditions_met.append(all_match)
        else:
            any_match = any(phone in normalized_message_phone for phone in normalized_rule_phones)
            conditions_met.append(any_match)
    
    # Si aucune condition n'a été testée, ne pas classifier
    if not conditions_met:
        return False
    
    # Déterminer si toutes les conditions sont remplies selon match_type
    if match_type == "all":
        # Toutes les conditions doivent être vraies
        return all(conditions_met)
    else:
        # Au moins une condition doit être vraie
        return any(conditions_met)


def _normalize_phone(phone: str) -> str:
    """Normalise un numéro de téléphone pour comparaison."""
    if not phone:
        return ""
    # Enlever tous les caractères non numériques sauf le +
    normalized = re.sub(r'[^\d+]', '', phone)
    # Si commence par +, garder, sinon ajouter selon le contexte
    return normalized


def reclassify_all_conversations_with_filters(
    db: Session,
    company_id: int,
    force: bool = False
) -> dict:
    """
    Reclasse toutes les conversations d'une entreprise en utilisant des filtres.
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        force: Si True, reclasse même les conversations déjà dans un dossier
    
    Returns:
        Dict avec les statistiques de classification
    """
    stats = {
        "total": 0,
        "classified": 0,
        "not_classified": 0,
        "errors": 0
    }
    
    try:
        logger.info(f"[FOLDER FILTER] Début de la reclassification avec filtres pour l'entreprise {company_id}")
        
        # Récupérer toutes les conversations
        query = db.query(Conversation).filter(Conversation.company_id == company_id)
        
        if not force:
            query = query.filter(Conversation.folder_id.is_(None))
        
        conversations = query.all()
        stats["total"] = len(conversations)
        
        logger.info(f"[FOLDER FILTER] {stats['total']} conversation(s) à reclasser")
        
        if stats["total"] == 0:
            return stats
        
        # Classifier chaque conversation
        for conversation in conversations:
            try:
                # Récupérer le dernier message
                last_message = db.query(InboxMessage).filter(
                    InboxMessage.conversation_id == conversation.id
                ).order_by(InboxMessage.created_at.desc()).first()
                
                if not last_message:
                    stats["not_classified"] += 1
                    continue
                
                old_folder_id = conversation.folder_id
                
                # Classifier avec les filtres
                folder_id = classify_conversation_with_filters(
                    db=db,
                    conversation=conversation,
                    message=last_message,
                    company_id=company_id
                )
                
                if folder_id:
                    conversation.folder_id = folder_id
                    db.commit()
                    
                    if old_folder_id != folder_id:
                        logger.info(f"[FOLDER FILTER] ✅ Conversation {conversation.id} déplacée vers le dossier {folder_id}")
                        stats["classified"] += 1
                    else:
                        stats["not_classified"] += 1
                else:
                    stats["not_classified"] += 1
                    
            except Exception as e:
                logger.error(f"[FOLDER FILTER] Erreur lors de la classification de la conversation {conversation.id}: {e}")
                stats["errors"] += 1
                continue
        
        logger.info(f"[FOLDER FILTER] Reclassification terminée: {stats['classified']} classée(s), {stats['not_classified']} non classée(s), {stats['errors']} erreur(s)")
        return stats
        
    except Exception as e:
        logger.error(f"[FOLDER FILTER] Erreur lors de la reclassification: {e}")
        import traceback
        traceback.print_exc()
        return stats

