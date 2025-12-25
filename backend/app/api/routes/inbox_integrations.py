"""
Routes pour gérer les intégrations (IMAP, API externes) pour recevoir les messages.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Tuple
from app.db.session import get_db
from app.db.models.company import Company
from app.db.models.inbox_integration import InboxIntegration
from app.api.deps import get_current_active_user
from app.core.imap_service import fetch_emails_async, get_message_ids_from_imap_async
from app.core.conversation_classifier import auto_classify_conversation_status
from app.core.folder_ai_classifier import classify_conversation_to_folder
from app.core.ai_classifier_service import AIClassifierService
from app.api.schemas.inbox_integration import (
    InboxIntegrationCreate,
    InboxIntegrationUpdate,
    InboxIntegrationRead
)
from datetime import datetime, timedelta
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder, MessageAttachment
from app.db.models.client import Client
from app.db.models.company_settings import CompanySettings
from pathlib import Path
import uuid
from app.core.config import settings
from app.core.encryption_service import get_encryption_service

router = APIRouter(prefix="/inbox/integrations", tags=["inbox-integrations"])

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


# ===== FONCTIONS UTILITAIRES =====

def normalize_message_id(message_id: str) -> str:
    """
    Normalise un Message-ID en enlevant les chevrons < > et les espaces.
    """
    if not message_id:
        return ""
    return message_id.strip().strip("<>").strip()

def normalize_subject(subject: str) -> str:
    """
    Normalise un sujet d'email en enlevant les préfixes Re:, RE:, Fwd:, etc.
    Exemples:
    - "Re: Bonjour" -> "Bonjour"
    - "RE: Re: Test" -> "Test"
    - "Fwd: Re: Hello" -> "Hello"
    """
    if not subject:
        return ""
    
    # Enlever les préfixes courants (insensible à la casse)
    prefixes = ["re:", "fwd:", "fw:", "tr:", "aw:"]
    normalized = subject.strip()
    
    while True:
        found = False
        for prefix in prefixes:
            if normalized.lower().startswith(prefix):
                normalized = normalized[len(prefix):].strip()
                # Enlever aussi les deux-points et espaces au début
                normalized = normalized.lstrip(":").strip()
                found = True
                break
        if not found:
            break
    
    return normalized.strip()

def find_conversation_from_reply(
    db: Session,
    company_id: int,
    in_reply_to: Optional[str],
    references: Optional[List[str]],
    normalized_subject: str,
    from_email: Optional[str]
) -> Optional[Conversation]:
    """
    Trouve une conversation existante en utilisant les en-têtes In-Reply-To ou References.
    Utilisé pour regrouper les réponses dans la même conversation.
    """
    # D'abord, essayer de trouver via In-Reply-To
    if in_reply_to:
        normalized_in_reply_to = normalize_message_id(in_reply_to)
        # Chercher un message avec ce Message-ID comme external_id
        replied_message = db.query(InboxMessage).join(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.source == "email",
            or_(
                InboxMessage.external_id == normalized_in_reply_to,
                InboxMessage.external_id == in_reply_to,
                InboxMessage.external_id == f"<{normalized_in_reply_to}>",
                InboxMessage.external_id.like(f"%{normalized_in_reply_to}%")
            )
        ).first()
        
        if replied_message:
            # Retourner la conversation du message auquel on répond
            conversation = db.query(Conversation).filter(
                Conversation.id == replied_message.conversation_id,
                Conversation.company_id == company_id
            ).first()
            if conversation:
                return conversation
    
    # Ensuite, essayer via References (première référence = message original)
    if references and len(references) > 0:
        first_reference = normalize_message_id(references[0])
        # Chercher un message avec ce Message-ID comme external_id
        referenced_message = db.query(InboxMessage).join(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.source == "email",
            or_(
                InboxMessage.external_id == first_reference,
                InboxMessage.external_id == references[0],
                InboxMessage.external_id == f"<{first_reference}>",
                InboxMessage.external_id.like(f"%{first_reference}%")
            )
        ).first()
        
        if referenced_message:
            conversation = db.query(Conversation).filter(
                Conversation.id == referenced_message.conversation_id,
                Conversation.company_id == company_id
            ).first()
            if conversation:
                return conversation
    
    # Enfin, essayer de trouver via le sujet normalisé (sans Re:, etc.)
    if normalized_subject:
        conversation = db.query(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.source == "email",
            Conversation.subject == normalized_subject
        ).first()
        if conversation:
            return conversation
        
        # Aussi chercher avec le sujet original (au cas où)
        conversation = db.query(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.source == "email",
            Conversation.subject.like(f"%{normalized_subject}%")
        ).first()
        if conversation:
            return conversation
    
    return None

def is_duplicate_message(db: Session, company_id: int, message_id: str, from_email: str, content: str, email_date: Optional[datetime] = None) -> bool:
    """
    Vérifie si un message est un doublon EXACT (même Message-ID).
    Ne bloque PAS les messages similaires - ils seront tous affichés dans la conversation.
    """
    if not message_id:
        return False  # Pas de Message-ID, on ne peut pas vérifier les doublons
    
    normalized_id = normalize_message_id(message_id)
    
    # Vérifier uniquement avec le Message-ID normalisé (vrais doublons uniquement)
    existing = db.query(InboxMessage).join(Conversation).filter(
        Conversation.company_id == company_id,
        or_(
            InboxMessage.external_id == normalized_id,
            InboxMessage.external_id == message_id,
            InboxMessage.external_id == f"<{normalized_id}>",
            InboxMessage.external_id.like(f"%{normalized_id}%")
        )
    ).first()
    
    # Si un message avec le même Message-ID existe déjà, c'est un vrai doublon
    return existing is not None

def detect_newsletter_or_spam(email_data: dict) -> Tuple[bool, str]:
    """
    Détecte si un email est une newsletter ou du spam.
    Retourne (is_filtered, reason) où reason peut être "newsletter" ou "spam"
    
    NOTE: Filtres désactivés pour ne pas bloquer d'emails légitimes.
    Utiliser plutôt la classification IA pour classer les emails dans des dossiers.
    """
    # Filtres désactivés - tous les emails sont acceptés
    # La classification IA se chargera de classer les emails dans les bons dossiers
    return (False, "")


def create_default_folders(db: Session, company_id: int):
    """
    Crée les dossiers par défaut pour une entreprise s'ils n'existent pas.
    Note: Les dossiers Spam, Newsletters et Notifications ont été supprimés.
    """
    # Plus aucun dossier par défaut - les utilisateurs créent leurs propres dossiers
    default_folders = []
    
    created_count = 0
    for folder_data in default_folders:
        # Vérifier si le dossier existe déjà
        existing_folder = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id,
            InboxFolder.name == folder_data["name"],
            InboxFolder.is_system == folder_data["is_system"]
        ).first()
        
        if not existing_folder:
            folder = InboxFolder(
                company_id=company_id,
                name=folder_data["name"],
                folder_type=folder_data["folder_type"],
                is_system=folder_data["is_system"],
                color=folder_data.get("color", "#6B7280"),
                ai_rules=folder_data.get("ai_rules", {})
            )
            db.add(folder)
            created_count += 1
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[INIT FOLDERS] Dossier par défaut créé: {folder_data['name']} pour l'entreprise {company_id}")
    
    if created_count > 0:
        db.commit()
    
    return created_count


# NOTE: get_or_create_spam_folder et cleanup_old_spam_messages ont été supprimés
# car les dossiers Spam, Newsletters et Notifications ne sont plus utilisés


# ===== GESTION DES INTÉGRATIONS =====

@router.get("", response_model=List[InboxIntegrationRead])
def get_integrations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Récupère toutes les intégrations de l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    integrations = db.query(InboxIntegration).filter(
        InboxIntegration.company_id == current_user.company_id
    ).all()
    
    # Masquer les mots de passe/clés API dans la réponse
    result = []
    for integration in integrations:
        integration_dict = {
            "id": integration.id,
            "company_id": integration.company_id,
            "integration_type": integration.integration_type,
            "name": integration.name,
            "is_active": integration.is_active,
            "is_primary": getattr(integration, 'is_primary', False),  # Ajouter is_primary
            "sync_interval_minutes": integration.sync_interval_minutes,
            "imap_server": integration.imap_server,
            "imap_port": integration.imap_port,
            "email_address": integration.email_address,
            "email_password": "***" if integration.email_password else None,  # Masquer
            "use_ssl": integration.use_ssl,
            "api_key": "***" if integration.api_key else None,  # Masquer
            "webhook_url": integration.webhook_url,
            "webhook_secret": "***" if integration.webhook_secret else None,  # Masquer
            "account_id": integration.account_id,
            "phone_number": integration.phone_number,
            "last_sync_at": integration.last_sync_at,
            "last_sync_status": integration.last_sync_status,
            "last_sync_error": integration.last_sync_error,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }
        result.append(InboxIntegrationRead(**integration_dict))
    
    return result


@router.post("", response_model=InboxIntegrationRead, status_code=status.HTTP_201_CREATED)
def create_integration(
    integration_data: InboxIntegrationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Crée une nouvelle intégration (boîte mail, API, etc.).
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can create integrations"
        )
    
    # Si cette intégration est marquée comme principale, désactiver les autres
    is_primary = getattr(integration_data, 'is_primary', False)
    if is_primary:
        # Mettre toutes les autres intégrations de l'entreprise à is_primary=False
        db.query(InboxIntegration).filter(
            InboxIntegration.company_id == current_user.company_id,
            InboxIntegration.id != None  # Toutes les intégrations
        ).update({"is_primary": False})
    
    integration = InboxIntegration(
        company_id=current_user.company_id,
        integration_type=integration_data.integration_type,
        name=integration_data.name,
        is_active=integration_data.is_active,
        is_primary=is_primary,
        sync_interval_minutes=integration_data.sync_interval_minutes,
        imap_server=integration_data.imap_server,
        imap_port=integration_data.imap_port,
        email_address=integration_data.email_address,
        email_password=get_encryption_service().encrypt(integration_data.email_password) if integration_data.email_password else None,
        use_ssl=integration_data.use_ssl,
        # Pour les intégrations SMS, les credentials sont optionnels (compte centralisé)
        # Si fournis, on les chiffre pour compatibilité rétroactive
        api_key=get_encryption_service().encrypt(integration_data.api_key) if integration_data.api_key else None,
        webhook_url=integration_data.webhook_url,
        webhook_secret=get_encryption_service().encrypt(integration_data.webhook_secret) if integration_data.webhook_secret else None,
        account_id=integration_data.account_id,
        phone_number=integration_data.phone_number,
    )
    
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    # Masquer les secrets dans la réponse
    integration_dict = integration.__dict__.copy()
    integration_dict["email_password"] = "***" if integration.email_password else None
    integration_dict["api_key"] = "***" if integration.api_key else None
    integration_dict["webhook_secret"] = "***" if integration.webhook_secret else None
    
    return InboxIntegrationRead(**integration_dict)


@router.patch("/{integration_id}", response_model=InboxIntegrationRead)
def update_integration(
    integration_id: int,
    integration_data: InboxIntegrationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Met à jour une intégration.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can update integrations"
        )
    
    integration = db.query(InboxIntegration).filter(
        InboxIntegration.id == integration_id,
        InboxIntegration.company_id == current_user.company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Mettre à jour uniquement les champs fournis
    update_data = integration_data.model_dump(exclude_unset=True)
    
    # Si on marque cette intégration comme principale, désactiver les autres
    if update_data.get('is_primary') is True:
        # Mettre toutes les autres intégrations de l'entreprise à is_primary=False
        db.query(InboxIntegration).filter(
            InboxIntegration.company_id == current_user.company_id,
            InboxIntegration.id != integration_id  # Exclure celle qu'on met à jour
        ).update({"is_primary": False})
    
    # Chiffrer les champs sensibles lors de la mise à jour
    encryption_service = get_encryption_service()
    for field, value in update_data.items():
        if field in ['email_password', 'api_key', 'webhook_secret'] and value:
            # Chiffrer seulement si une nouvelle valeur est fournie
            setattr(integration, field, encryption_service.encrypt(value))
        else:
            setattr(integration, field, value)
    
    db.commit()
    db.refresh(integration)
    
    # Masquer les secrets
    integration_dict = integration.__dict__.copy()
    integration_dict["email_password"] = "***" if integration.email_password else None
    integration_dict["api_key"] = "***" if integration.api_key else None
    integration_dict["webhook_secret"] = "***" if integration.webhook_secret else None
    
    return InboxIntegrationRead(**integration_dict)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Supprime une intégration.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can delete integrations"
        )
    
    integration = db.query(InboxIntegration).filter(
        InboxIntegration.id == integration_id,
        InboxIntegration.company_id == current_user.company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    db.delete(integration)
    db.commit()
    return


# ===== SYNCHRONISATION =====

@router.post("/{integration_id}/sync")
async def sync_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Synchronise une intégration spécifique par son ID.
    Utilise les paramètres stockés dans l'intégration pour la synchronisation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can sync integrations"
        )
    
    # Récupérer l'intégration
    integration = db.query(InboxIntegration).filter(
        InboxIntegration.id == integration_id,
        InboxIntegration.company_id == current_user.company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    if not integration.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integration is not active"
        )
    
    if integration.integration_type != "imap":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sync not implemented for integration type: {integration.integration_type}"
        )
    
    if not integration.imap_server or not integration.email_address or not integration.email_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IMAP configuration is incomplete"
        )
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Récupérer les settings de l'entreprise pour obtenir la liste noire de domaines
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == company.id
    ).first()
    
    blocked_client_domains = []
    if company_settings and company_settings.settings:
        clients_settings = company_settings.settings.get("clients", {})
        blocked_client_domains = clients_settings.get("blocked_client_domains", [])
    
    # Liste noire par défaut si pas de settings
    if not blocked_client_domains:
        blocked_client_domains = [
            "@amazon.com",
            "@paypal.com",
            "@noreply",
            "@no-reply",
            "@notifications",
            "@notification",
            "@automated",
            "@system",
            "@service",
            "@donotreply"
        ]
    
    # Mettre à jour le statut de synchronisation
    integration.last_sync_status = None
    integration.last_sync_error = None
    
    try:
        # Récupérer les emails depuis IMAP
        # Déchiffrer le mot de passe avant utilisation
        encryption_service = get_encryption_service()
        decrypted_password = encryption_service.decrypt(integration.email_password) if integration.email_password else None
        
        emails = await fetch_emails_async(
            imap_server=integration.imap_server,
            imap_port=integration.imap_port or 993,
            email_address=integration.email_address,
            password=decrypted_password,
            company_code=company.code,
            use_ssl=integration.use_ssl if integration.use_ssl is not None else True
        )
        
        # Détecter et supprimer les emails supprimés depuis la boîte mail
        deleted_count = 0
        try:
            print(f"[SYNC] Détection des emails supprimés depuis la boîte mail...")
            # Récupérer tous les Message-IDs présents dans INBOX
            # Déchiffrer le mot de passe avant utilisation
            decrypted_password = encryption_service.decrypt(integration.email_password) if integration.email_password else None
            
            imap_message_ids = await get_message_ids_from_imap_async(
                imap_server=integration.imap_server,
                imap_port=integration.imap_port or 993,
                email_address=integration.email_address,
                password=decrypted_password,
                use_ssl=integration.use_ssl if integration.use_ssl is not None else True
            )
            
            # Convertir en set pour une recherche rapide
            imap_message_ids_set = set(imap_message_ids)
            print(f"[SYNC] {len(imap_message_ids_set)} Message-ID(s) présents dans INBOX")
            
            # Récupérer tous les messages stockés pour cette intégration
            # Pour les nouveaux messages, on utilise l'integration_id dans les métadonnées
            # Pour les anciens messages, on vérifie tous les messages de l'entreprise
            stored_messages_with_integration = db.query(InboxMessage).join(Conversation).filter(
                Conversation.company_id == company.id,
                InboxMessage.source == "email",
                InboxMessage.external_id.isnot(None)  # Seulement les messages avec Message-ID
            ).all()
            
            print(f"[SYNC] {len(stored_messages_with_integration)} message(s) stocké(s) dans la base de données pour l'entreprise")
            
            # Filtrer les messages qui appartiennent à cette intégration
            # Pour simplifier, on vérifie TOUS les messages de l'entreprise qui ont un external_id
            # (On ne peut pas distinguer facilement les messages de différentes intégrations pour les anciens)
            messages_to_check = []
            messages_with_integration_id = 0
            messages_without_integration_id = 0
            
            for msg in stored_messages_with_integration:
                metadata = msg.external_metadata or {}
                integration_id = metadata.get("integration_id")
                
                # Si l'ID de l'intégration correspond, c'est un message de cette intégration
                if integration_id == integration.id:
                    messages_to_check.append(msg)
                    messages_with_integration_id += 1
                # Pour les anciens messages sans integration_id, on les vérifie TOUS
                # (On suppose qu'ils appartiennent à cette intégration si c'est la seule, ou on les vérifie tous)
                elif integration_id is None:
                    messages_without_integration_id += 1
                    # Inclure tous les messages sans integration_id pour vérification
                    messages_to_check.append(msg)
            
            print(f"[SYNC] {messages_with_integration_id} message(s) avec integration_id={integration.id}")
            print(f"[SYNC] {messages_without_integration_id} message(s) sans integration_id (tous vérifiés)")
            print(f"[SYNC] {len(messages_to_check)} message(s) à vérifier pour cette intégration")
            
            # Normaliser les Message-IDs pour la comparaison (enlever les chevrons < >)
            normalized_imap_ids = set()
            for msg_id in imap_message_ids_set:
                normalized_id = msg_id.strip().strip("<>")
                normalized_imap_ids.add(normalized_id)
            
            print(f"[SYNC] Message-IDs IMAP normalisés: {len(normalized_imap_ids)}")
            
            # Supprimer les messages qui ne sont plus dans INBOX
            for msg in messages_to_check:
                if msg.external_id:
                    # Normaliser le Message-ID du message stocké aussi
                    normalized_msg_id = msg.external_id.strip().strip("<>")
                    
                    if normalized_msg_id not in normalized_imap_ids:
                        print(f"[SYNC] Message supprimé détecté: {normalized_msg_id[:50]}... (normalisé)")
                        if len(normalized_imap_ids) > 0:
                            print(f"[SYNC] Exemple de Message-IDs IMAP disponibles: {list(normalized_imap_ids)[:3]}...")  # Afficher les 3 premiers pour debug
                        
                        # Trouver la conversation associée
                        conversation = db.query(Conversation).filter(
                            Conversation.id == msg.conversation_id
                        ).first()
                        
                        if conversation:
                            # Supprimer le message
                            db.delete(msg)
                            
                            # Vérifier s'il reste d'autres messages dans la conversation
                            remaining_messages = db.query(InboxMessage).filter(
                                InboxMessage.conversation_id == conversation.id
                            ).count()
                            
                            # Si c'est le dernier message, supprimer aussi la conversation
                            if remaining_messages <= 1:
                                print(f"[SYNC] Suppression de la conversation (dernier message supprimé)")
                                db.delete(conversation)
                            else:
                                # Mettre à jour la conversation
                                last_message = db.query(InboxMessage).filter(
                                    InboxMessage.conversation_id == conversation.id
                                ).order_by(InboxMessage.created_at.desc()).first()
                                
                                if last_message:
                                    conversation.last_message_at = last_message.created_at
                            
                            deleted_count += 1
                    else:
                        print(f"[SYNC] Message toujours présent dans INBOX: {normalized_msg_id[:50]}...")
            
            if deleted_count > 0:
                db.commit()
                print(f"[SYNC] {deleted_count} message(s) supprimé(s) car absents de INBOX")
            else:
                print(f"[SYNC] Aucun message à supprimer")
                
        except Exception as e:
            print(f"[SYNC] Erreur lors de la détection des emails supprimés: {e}")
            import traceback
            traceback.print_exc()
            # On continue même en cas d'erreur pour ne pas bloquer la synchronisation
        
        # ===== OPTIMISATION PHASE 1: Préchargement des données =====
        # OPT 3.1: Précharger tous les clients de l'entreprise en mémoire
        print(f"[SYNC] Préchargement des clients pour l'entreprise {company.id}...")
        existing_clients = {
            client.email: client
            for client in db.query(Client).filter(
                Client.company_id == company.id
            ).all()
        }
        print(f"[SYNC] {len(existing_clients)} client(s) préchargé(s)")
        
        # OPT 3.2: Précharger tous les Message-IDs existants en mémoire
        print(f"[SYNC] Préchargement des Message-IDs existants...")
        existing_message_ids = set()
        stored_messages = db.query(InboxMessage.external_id).join(Conversation).filter(
            Conversation.company_id == company.id,
            InboxMessage.external_id.isnot(None)
        ).all()
        for msg in stored_messages:
            if msg.external_id:
                normalized_id = normalize_message_id(msg.external_id)
                existing_message_ids.add(normalized_id)
        print(f"[SYNC] {len(existing_message_ids)} Message-ID(s) préchargé(s)")
        
        # OPT 6: Filtrer les doublons AVANT tout traitement
        print(f"[SYNC] Filtrage précoce des doublons...")
        unique_emails = []
        duplicate_count = 0
        for email_data in emails:
            message_id = email_data.get("message_id")
            if message_id:
                normalized_id = normalize_message_id(message_id)
                if normalized_id in existing_message_ids:
                    duplicate_count += 1
                    print(f"[SYNC] Email en doublon détecté (filtrage précoce): {email_data.get('subject', 'Sans sujet')[:50]}")
                    continue
            unique_emails.append(email_data)
        print(f"[SYNC] {duplicate_count} doublon(s) filtré(s) avant traitement, {len(unique_emails)} email(s) unique(s) à traiter")
        
        # ===== OPTIMISATION PHASE 2: Batch detection notifications =====
        # OPT 1.1: Collecter tous les emails sans client pour détection batch
        emails_without_client = []
        email_index_map = {}  # Mapping email_data -> index pour retrouver l'email_id
        for i, email_data in enumerate(unique_emails):
            from_email = email_data.get("from", {}).get("email")
            if from_email and from_email not in existing_clients:
                email_id = f"email_{i}"
                emails_without_client.append({
                    "email_id": email_id,
                    "from_email": from_email,
                    "subject": email_data.get("subject", ""),
                    "content_preview": (email_data.get("content", "") or "")[:200]
                })
                email_index_map[id(email_data)] = email_id  # Utiliser id() pour créer une clé unique
        
        # Détection batch des notifications (un seul appel IA)
        notification_results = {}
        if emails_without_client:
            print(f"[SYNC] Détection batch de {len(emails_without_client)} email(s) sans client...")
            try:
                ai_service = AIClassifierService()
                notification_results = ai_service.is_notification_email_batch(emails_without_client)
                notifications_count = sum(1 for v in notification_results.values() if v)
                clients_count = len(notification_results) - notifications_count
                print(f"[SYNC] ✅ Détection batch terminée: {notifications_count} notification(s), {clients_count} client(s)")
            except Exception as e:
                print(f"[SYNC] Erreur lors de la détection batch: {e}")
                # Fallback: considérer tous comme clients
                for email_item in emails_without_client:
                    notification_results[email_item["email_id"]] = False
        
        # ===== OPTIMISATION PHASE 1: Collecte des nouvelles conversations pour classification batch =====
        new_conversations_for_classification = []  # Liste des nouvelles conversations à classifier en batch
        
        # ===== OPTIMISATION PHASE 2: Batch commits =====
        # OPT 2: Traiter les emails par batch et commit par batch (15 emails par batch)
        BATCH_COMMIT_SIZE = 15
        processed = 0
        errors = []
        filtered_count = 0  # Compteur pour les emails filtrés (newsletters, etc.)
        current_batch = []  # Emails du batch actuel
        
        for i, email_data in enumerate(unique_emails):
            try:
                # Préparer les données
                message_id = email_data.get("message_id")
                from_email = email_data.get("from", {}).get("email")
                content = email_data.get("content", "")
                email_date_str = email_data.get("date")
                email_date = None
                
                # Parser la date si disponible
                if email_date_str:
                    try:
                        email_date = datetime.fromisoformat(email_date_str.replace('Z', '+00:00'))
                    except:
                        try:
                            email_date = datetime.fromisoformat(email_date_str)
                        except:
                            pass
                
                # Note: Les doublons ont déjà été filtrés en amont (OPT 6)
                
                # Détecter les newsletters/spam
                is_filtered, filter_reason = detect_newsletter_or_spam(email_data)
                
                # Si c'est du spam/newsletter, on le supprime immédiatement (on ne le stocke pas)
                if is_filtered:
                    filtered_count += 1
                    print(f"[SYNC] ⚠️ Email filtré comme {filter_reason}: {email_data.get('subject', 'Sans sujet')[:50]} de {from_email}")
                    continue  # Skip cet email complètement
                
                # Identifier ou créer le client (seulement si ce n'est pas une notification)
                # OPT 3.1: Utiliser le cache préchargé au lieu d'une requête DB
                # OPT 1.1: Utiliser les résultats de la détection batch
                client = None
                if from_email:
                    # Utiliser le cache préchargé (O(1) lookup)
                    client = existing_clients.get(from_email)
                    
                    # Si le client n'existe pas, utiliser les résultats de la détection batch
                    if not client:
                        # Trouver l'email_id correspondant dans le batch
                        email_id = email_index_map.get(id(email_data))
                        
                        # Utiliser le résultat de la détection batch
                        is_notification = notification_results.get(email_id, False) if email_id else False
                        
                        if not is_notification:
                            # Vérifier si c'est un vrai client (Option 6: Hybride IA + Liste noire)
                            subject = email_data.get("subject", "")
                            content_preview = (email_data.get("content", "") or "")[:200]
                            
                            ai_service = AIClassifierService()
                            is_real_client = ai_service.is_real_client_email(
                                from_email=from_email,
                                subject=subject,
                                content_preview=content_preview,
                                blocked_domains=blocked_client_domains
                            )
                            
                            if is_real_client:
                                # Créer le client seulement si c'est un vrai client
                                client = Client(
                                    company_id=company.id,
                                    name=email_data.get("from", {}).get("name", from_email.split("@")[0]),
                                    email=from_email,
                                    type="Client"
                                )
                                db.add(client)
                                db.flush()
                                # Mettre à jour le cache pour les prochains emails
                                existing_clients[from_email] = client
                                print(f"[SYNC] ✅ Nouveau client créé: {client.name} ({client.email})")
                            else:
                                print(f"[SYNC] ⚠️ Email filtré (pas un vrai client): {from_email}")
                        else:
                            print(f"[SYNC] ⚠️ Email de notification détecté (batch), client non créé: {from_email}")
                
                # Chercher ou créer une conversation
                subject = email_data.get("subject", "")
                normalized_subject = normalize_subject(subject) if subject else ""
                
                # Récupérer les en-têtes de réponse
                in_reply_to = email_data.get("in_reply_to")
                references = email_data.get("references", [])
                
                conversation = None
                
                # D'abord, essayer de trouver via In-Reply-To ou References (pour les réponses)
                if in_reply_to or references:
                    conversation = find_conversation_from_reply(
                        db,
                        company.id,
                        in_reply_to,
                        references,
                        normalized_subject,
                        from_email
                    )
                    if conversation:
                        print(f"[SYNC] Conversation trouvée via In-Reply-To/References: {conversation.id}")
                
                # Sinon, chercher par sujet (normalisé ou original)
                if not conversation:
                    if normalized_subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == normalized_subject
                        ).first()
                    
                    # Aussi chercher avec le sujet original
                    if not conversation and subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == subject
                        ).first()
                
                # Si aucune conversation trouvée, créer une nouvelle
                is_new_conversation = False
                if not conversation:
                    # Utiliser le sujet normalisé pour la nouvelle conversation
                    conversation_subject = normalized_subject if normalized_subject else subject
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
                    is_new_conversation = True
                    print(f"[SYNC] ✅ Nouvelle conversation créée: ID={conversation.id} - Sujet='{conversation_subject[:50]}' - De={from_email}")
                
                # Normaliser le Message-ID avant de le stocker
                normalized_message_id = normalize_message_id(message_id) if message_id else None
                
                # Créer le message
                # Utiliser le contenu texte (déjà nettoyé du HTML) plutôt que le HTML brut
                message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=email_data.get("from", {}).get("name", from_email or "Inconnu"),
                    from_email=from_email,
                    content=content,
                    source="email",
                    is_from_client=True,
                    read=False,
                    external_id=normalized_message_id,  # Utiliser le Message-ID normalisé
                    external_metadata={
                        "to": email_data.get("to"),
                        "imap_uid": email_data.get("imap_uid"),  # Stocker l'UID IMAP pour la suppression
                        "integration_id": integration.id,  # Stocker l'ID de l'intégration pour la détection des suppressions
                    }
                )
                db.add(message)
                db.flush()  # Pour obtenir l'ID du message
                
                # Mettre à jour le cache des Message-IDs pour éviter les doublons dans la même sync
                if normalized_message_id:
                    existing_message_ids.add(normalized_message_id)
                
                # Sauvegarder les pièces jointes
                attachments_data = email_data.get("attachments", [])
                if attachments_data:
                    company_upload_dir = UPLOAD_DIR / str(company.id)
                    company_upload_dir.mkdir(parents=True, exist_ok=True)
                    
                    for att_data in attachments_data:
                        if not att_data.get("content"):
                            continue  # Skip si pas de contenu
                        
                        filename = att_data.get("filename", "attachment")
                        file_content = att_data.get("content")
                        
                        # Générer un nom de fichier unique
                        file_ext = Path(filename).suffix or ""
                        unique_filename = f"{uuid.uuid4()}{file_ext}"
                        file_path = company_upload_dir / unique_filename
                        
                        # Sauvegarder le fichier
                        try:
                            with open(file_path, "wb") as f:
                                f.write(file_content)
                            
                            # Créer l'objet MessageAttachment
                            attachment = MessageAttachment(
                                message_id=message.id,
                                name=filename,
                                file_type=get_file_type(filename),
                                file_path=str(file_path.relative_to(UPLOAD_DIR)),
                                file_size=len(file_content),
                                mime_type=att_data.get("content_type"),
                            )
                            db.add(attachment)
                        except Exception as e:
                            print(f"Erreur lors de la sauvegarde de la pièce jointe {filename}: {e}")
                            # Continue même si une pièce jointe échoue
                
                db.flush()  # Flush pour sauvegarder les pièces jointes
                
                conversation.last_message_at = datetime.utcnow()
                conversation.unread_count += 1
                
                # Classification automatique du statut (si pas déjà manuel)
                if conversation.status not in ["Archivé", "Spam", "Urgent"]:
                    # Classer automatiquement selon les règles
                    new_status = auto_classify_conversation_status(db, conversation, message)
                    conversation.status = new_status
                
                # OPT 1.2: Collecter les nouvelles conversations pour classification batch
                # Au lieu de classifier immédiatement, on collecte pour un traitement batch à la fin
                if is_new_conversation:
                    new_conversations_for_classification.append({
                        "conversation_id": conversation.id,
                        "conversation": conversation,
                        "message": message,
                        "content": (message.content or "")[:500],
                        "subject": conversation.subject or "",
                        "from_email": message.from_email or message.from_phone or ""
                    })
                
                # OPT 2: Ajouter à la liste du batch au lieu de commit immédiat
                current_batch.append({
                    "conversation": conversation,
                    "message": message,
                    "email_data": email_data
                })
                
                # Commit par batch (tous les 15 emails)
                if len(current_batch) >= BATCH_COMMIT_SIZE:
                    try:
                        db.commit()
                        print(f"[SYNC] ✅ Batch commit: {len(current_batch)} email(s) sauvegardé(s)")
                        
                        # Traiter les auto-réponses pour ce batch
                        for batch_item in current_batch:
                            conv = batch_item["conversation"]
                            msg = batch_item["message"]
                            if conv.folder_id and msg.is_from_client:
                                from app.core.auto_reply_service import trigger_auto_reply_if_needed
                                trigger_auto_reply_if_needed(db, conv, msg)
                        
                        processed += len(current_batch)
                        current_batch = []  # Réinitialiser le batch
                    except Exception as e:
                        db.rollback()
                        print(f"[SYNC] ❌ Erreur lors du batch commit: {e}")
                        # Ajouter toutes les erreurs du batch
                        for batch_item in current_batch:
                            errors.append({
                                "email": batch_item["email_data"].get("from", {}).get("email"),
                                "error": str(e)
                            })
                        current_batch = []
                
            except Exception as e:
                db.rollback()
                errors.append({
                    "email": email_data.get("from", {}).get("email"),
                    "error": str(e)
                })
        
        # OPT 2: Commit le dernier batch s'il reste des emails
        if current_batch:
            try:
                db.commit()
                print(f"[SYNC] ✅ Batch commit final: {len(current_batch)} email(s) sauvegardé(s)")
                
                # Traiter les auto-réponses pour le dernier batch
                for batch_item in current_batch:
                    conv = batch_item["conversation"]
                    msg = batch_item["message"]
                    if conv.folder_id and msg.is_from_client:
                        from app.core.auto_reply_service import trigger_auto_reply_if_needed
                        trigger_auto_reply_if_needed(db, conv, msg)
                
                processed += len(current_batch)
            except Exception as e:
                db.rollback()
                print(f"[SYNC] ❌ Erreur lors du batch commit final: {e}")
                for batch_item in current_batch:
                    errors.append({
                        "email": batch_item["email_data"].get("from", {}).get("email"),
                        "error": str(e)
                    })
        
        # ===== OPTIMISATION PHASE 1: Classification batch des nouvelles conversations =====
        # OPT 1.2: Classifier toutes les nouvelles conversations en un seul appel IA
        if new_conversations_for_classification:
            print(f"[SYNC] Classification batch de {len(new_conversations_for_classification)} nouvelle(s) conversation(s)...")
            try:
                # Récupérer les dossiers avec autoClassify activé
                all_folders = db.query(InboxFolder).filter(
                    InboxFolder.company_id == company.id
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
                
                if folders_with_ai:
                    # Préparer les messages pour le batch
                    messages_for_batch = [
                        {
                            "conversation_id": item["conversation_id"],
                            "content": item["content"],
                            "subject": item["subject"],
                            "from_email": item["from_email"]
                        }
                        for item in new_conversations_for_classification
                    ]
                    
                    # Appeler la classification batch (un seul appel IA)
                    ai_service = AIClassifierService()
                    if ai_service and ai_service.enabled:
                        batch_results = ai_service.classify_messages_batch(
                            messages=messages_for_batch,
                            folders=folders_with_ai,
                            company_context=None
                        )
                        
                        # Appliquer les résultats
                        # IMPORTANT: Recharger les conversations depuis la DB car elles ont été commitées individuellement
                        classified_count = 0
                        conversation_ids_to_update = [
                            item["conversation_id"]
                            for item in new_conversations_for_classification
                            if batch_results.get(item["conversation_id"])
                        ]
                        
                        if conversation_ids_to_update:
                            # Recharger les conversations depuis la DB pour les modifier
                            conversations_to_update = db.query(Conversation).filter(
                                Conversation.id.in_(conversation_ids_to_update)
                            ).all()
                            
                            for conversation in conversations_to_update:
                                folder_id = batch_results.get(conversation.id)
                                if folder_id:
                                    conversation.folder_id = folder_id
                                    classified_count += 1
                                    print(f"[SYNC] Nouvelle conversation {conversation.id} classée dans le dossier {folder_id}")
                            
                            if classified_count > 0:
                                db.commit()  # Commit des classifications
                                print(f"[SYNC] ✅ {classified_count} conversation(s) classée(s) en batch")
                    else:
                        print(f"[SYNC] ⚠️ Service IA non disponible, classification batch ignorée")
                else:
                    print(f"[SYNC] Aucun dossier avec autoClassify activé, classification batch ignorée")
            except Exception as e:
                print(f"[SYNC] Erreur lors de la classification batch: {e}")
                import traceback
                traceback.print_exc()
                # Ne pas faire échouer la synchronisation si la classification échoue
        
        # Mettre à jour les informations de synchronisation
        integration.last_sync_at = datetime.utcnow()
        if errors:
            integration.last_sync_status = "partial" if processed > 0 else "error"
            integration.last_sync_error = f"{len(errors)} erreur(s) lors de la synchronisation"
        else:
            integration.last_sync_status = "success"
            integration.last_sync_error = None
        
        db.commit()
        
        # Reclassifier les conversations sans dossier après la synchronisation
        # Cela permet de classer les conversations dans les bons dossiers même si les dossiers ont été créés/modifiés après
        print(f"[SYNC] Reclassification des conversations sans dossier...")
        try:
            from app.core.folder_ai_classifier import reclassify_all_conversations
            stats = reclassify_all_conversations(db=db, company_id=company.id, force=False)
            print(f"[SYNC] Reclassification terminée: {stats.get('classified', 0)} conversation(s) classée(s)")
            
            # Déclencher l'auto-réponse pour les conversations nouvellement classées
            if stats.get('classified', 0) > 0:
                print(f"[SYNC] Déclenchement de l'auto-réponse pour les conversations nouvellement classées...")
                from app.core.auto_reply_service import trigger_auto_reply_if_needed
                
                # Trouver les conversations qui viennent d'être classées (sans dossier avant, avec dossier maintenant)
                # On récupère les conversations récemment mises à jour
                recently_classified = db.query(Conversation).filter(
                    Conversation.company_id == company.id,
                    Conversation.folder_id.isnot(None),
                    Conversation.updated_at >= datetime.utcnow() - timedelta(minutes=5)
                ).all()
                
                auto_reply_triggered = 0
                for conv in recently_classified:
                    # Récupérer le dernier message du client
                    last_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conv.id,
                        InboxMessage.is_from_client == True
                    ).order_by(InboxMessage.created_at.desc()).first()
                    
                    if last_message:
                        trigger_auto_reply_if_needed(db, conv, last_message)
                        auto_reply_triggered += 1
                
                print(f"[SYNC] Auto-réponse déclenchée pour {auto_reply_triggered} conversation(s)")
        except Exception as e:
            print(f"[SYNC] Erreur lors de la reclassification: {e}")
            import traceback
            traceback.print_exc()
            # Ne pas faire échouer la synchronisation si la reclassification échoue
        
        return {
            "status": "success",
            "processed": processed,
            "total": len(emails),
            "filtered": filtered_count,  # Nombre d'emails filtrés et supprimés immédiatement (newsletters, etc.)
            "deleted": deleted_count,  # Nombre d'emails supprimés car absents de INBOX
            "errors": errors
        }
        
    except Exception as e:
        # Mettre à jour le statut d'erreur
        integration.last_sync_at = datetime.utcnow()
        integration.last_sync_status = "error"
        integration.last_sync_error = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing emails: {str(e)}"
        )


@router.post("/imap/sync")
async def sync_imap_emails(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    use_ssl: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Synchronise les emails depuis un serveur IMAP et les importe dans l'Inbox.
    L'utilisateur doit être owner ou super_admin.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can sync emails"
        )
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    try:
        # Récupérer les emails depuis IMAP
        emails = await fetch_emails_async(
            imap_server=imap_server,
            imap_port=imap_port,
            email_address=email_address,
            password=password,
            company_code=company.code,
            use_ssl=use_ssl
        )
        
        # Traiter chaque email directement (même logique que le webhook)
        processed = 0
        errors = []
        filtered_count = 0  # Compteur pour les emails filtrés (newsletters, etc.)
        
        for email_data in emails:
            try:
                # Vérifier les doublons AVANT tout traitement (plus efficace)
                message_id = email_data.get("message_id")
                if message_id:
                    existing_message = db.query(InboxMessage).filter(
                        InboxMessage.external_id == message_id
                    ).first()
                    
                    if existing_message:
                        # Message déjà stocké, on le skip pour éviter les doublons
                        continue
                
                # Détecter les newsletters/spam
                is_filtered, filter_reason = detect_newsletter_or_spam(email_data)
                
                # Si c'est du spam/newsletter, on le supprime immédiatement (on ne le stocke pas)
                if is_filtered:
                    filtered_count += 1
                    print(f"[SYNC] ⚠️ Email filtré comme {filter_reason}: {email_data.get('subject', 'Sans sujet')[:50]} de {from_email}")
                    continue  # Skip cet email complètement - pas de stockage
                
                # Identifier ou créer le client (seulement si ce n'est pas une notification)
                from_email = email_data.get("from", {}).get("email")
                client = None
                if from_email:
                    # D'abord vérifier si le client existe déjà (optimisation : pas besoin d'IA si client existe)
                    client = db.query(Client).filter(
                        Client.company_id == company.id,
                        Client.email == from_email
                    ).first()
                    
                    # Si le client n'existe pas, vérifier avec l'IA si c'est une notification avant de créer
                    if not client:
                        ai_service = AIClassifierService()
                        content_preview = email_data.get("content", "")[:200] if email_data.get("content") else ""
                        is_notification = ai_service.is_notification_email(
                            from_email=from_email,
                            subject=email_data.get("subject"),
                            content_preview=content_preview
                        )
                        
                        if not is_notification:
                            # Vérifier si c'est un vrai client (Option 6: Hybride IA + Liste noire)
                            is_real_client = ai_service.is_real_client_email(
                                from_email=from_email,
                                subject=email_data.get("subject", ""),
                                content_preview=content_preview,
                                blocked_domains=blocked_client_domains
                            )
                            
                            if is_real_client:
                                # Créer le client seulement si c'est un vrai client
                                client = Client(
                                    company_id=company.id,
                                    name=email_data.get("from", {}).get("name", from_email.split("@")[0]),
                                    email=from_email,
                                    type="Client"
                                )
                                db.add(client)
                                db.flush()
                                print(f"[SYNC IMAP] ✅ Nouveau client créé: {client.name} ({client.email})")
                            else:
                                print(f"[SYNC IMAP] ⚠️ Email filtré (pas un vrai client): {from_email}")
                        else:
                            print(f"[SYNC IMAP] ⚠️ Email de notification détecté, client non créé: {from_email}")
                
                # Chercher ou créer une conversation
                subject = email_data.get("subject", "")
                normalized_subject = normalize_subject(subject) if subject else ""
                
                # Récupérer les en-têtes de réponse
                in_reply_to = email_data.get("in_reply_to")
                references = email_data.get("references", [])
                
                conversation = None
                
                # D'abord, essayer de trouver via In-Reply-To ou References (pour les réponses)
                if in_reply_to or references:
                    conversation = find_conversation_from_reply(
                        db,
                        company.id,
                        in_reply_to,
                        references,
                        normalized_subject,
                        from_email
                    )
                    if conversation:
                        print(f"[SYNC] Conversation trouvée via In-Reply-To/References: {conversation.id}")
                
                # Sinon, chercher par sujet (normalisé ou original)
                if not conversation:
                    if normalized_subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == normalized_subject
                        ).first()
                    
                    # Aussi chercher avec le sujet original
                    if not conversation and subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.source == "email",
                            Conversation.subject == subject
                        ).first()
                
                # Si aucune conversation trouvée, créer une nouvelle
                if not conversation:
                    # Utiliser le sujet normalisé pour la nouvelle conversation
                    conversation_subject = normalized_subject if normalized_subject else subject
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
                    print(f"[SYNC] ✅ Nouvelle conversation créée: ID={conversation.id} - Sujet='{conversation_subject[:50]}' - De={from_email}")
                
                # Vérifier si le message existe déjà (éviter les doublons)
                message_id = email_data.get("message_id")
                if message_id:
                    existing_message = db.query(InboxMessage).filter(
                        InboxMessage.external_id == message_id
                    ).first()
                    
                    if existing_message:
                        # Message déjà stocké, on le skip pour éviter les doublons
                        continue
                
                # Créer le message
                # Utiliser le contenu texte (déjà nettoyé du HTML) plutôt que le HTML brut
                content = email_data.get("content", "")
                message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=email_data.get("from", {}).get("name", from_email or "Inconnu"),
                    from_email=from_email,
                    content=content,
                    source="email",
                    is_from_client=True,
                    read=False,
                    external_id=message_id,
                    external_metadata={
                        "to": email_data.get("to"),
                        "imap_uid": email_data.get("imap_uid"),  # Stocker l'UID IMAP pour la suppression
                    }
                )
                db.add(message)
                
                conversation.last_message_at = datetime.utcnow()
                conversation.unread_count += 1
                
                db.commit()
                processed += 1
                
            except Exception as e:
                db.rollback()
                errors.append({
                    "email": email_data.get("from", {}).get("email"),
                    "error": str(e)
                })
        
        # Reclassifier les conversations sans dossier après la synchronisation
        # Cela permet de classer les conversations dans les bons dossiers même si les dossiers ont été créés/modifiés après
        print(f"[SYNC IMAP] Reclassification des conversations sans dossier...")
        try:
            from app.core.folder_ai_classifier import reclassify_all_conversations
            stats = reclassify_all_conversations(db=db, company_id=company.id, force=False)
            print(f"[SYNC IMAP] Reclassification terminée: {stats.get('classified', 0)} conversation(s) classée(s)")
            
            # Déclencher l'auto-réponse pour les conversations nouvellement classées
            if stats.get('classified', 0) > 0:
                print(f"[SYNC IMAP] Déclenchement de l'auto-réponse pour les conversations nouvellement classées...")
                from app.core.auto_reply_service import trigger_auto_reply_if_needed
                
                # Trouver les conversations qui viennent d'être classées (sans dossier avant, avec dossier maintenant)
                recently_classified = db.query(Conversation).filter(
                    Conversation.company_id == company.id,
                    Conversation.folder_id.isnot(None),
                    Conversation.updated_at >= datetime.utcnow() - timedelta(minutes=5)
                ).all()
                
                auto_reply_triggered = 0
                for conv in recently_classified:
                    # Récupérer le dernier message du client
                    last_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conv.id,
                        InboxMessage.is_from_client == True
                    ).order_by(InboxMessage.created_at.desc()).first()
                    
                    if last_message:
                        trigger_auto_reply_if_needed(db, conv, last_message)
                        auto_reply_triggered += 1
                
                print(f"[SYNC IMAP] Auto-réponse déclenchée pour {auto_reply_triggered} conversation(s)")
        except Exception as e:
            print(f"[SYNC IMAP] Erreur lors de la reclassification: {e}")
            import traceback
            traceback.print_exc()
            # Ne pas faire échouer la synchronisation si la reclassification échoue
        
        return {
            "status": "success",
            "processed": processed,
            "total": len(emails),
            "filtered": filtered_count,  # Nombre d'emails filtrés et supprimés immédiatement (newsletters, etc.)
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing emails: {str(e)}"
        )


@router.post("/sync-all")
@router.get("/sync-all")
async def sync_all_integrations_endpoint(
    secret: Optional[str] = Query(None, description="Secret pour protéger l'endpoint (variable CRON_SECRET)"),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour déclencher la synchronisation de toutes les intégrations inbox actives.
    
    Cet endpoint peut être appelé :
    - Manuellement via POST/GET /api/inbox/integrations/sync-all?secret=YOUR_CRON_SECRET
    - Via un service externe de cron (cron-job.org, EasyCron, etc.) toutes les minutes
    - Via un webhook périodique
    
    Protection : Nécessite le paramètre 'secret' qui doit correspondre à CRON_SECRET
    """
    import logging
    from app.core.config import settings
    import asyncio
    
    logger = logging.getLogger(__name__)
    
    # Vérifier le secret si configuré
    if settings.CRON_SECRET:
        if not secret or secret != settings.CRON_SECRET:
            logger.warning("Tentative d'accès à /sync-all sans secret valide")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid secret. Provide ?secret=YOUR_CRON_SECRET"
            )
    else:
        # En développement, log un avertissement si pas de secret configuré
        logger.warning("CRON_SECRET non configuré - l'endpoint est accessible sans protection")
    
    try:
        # Importer la fonction de synchronisation depuis le script
        import sys
        import os
        from pathlib import Path
        
        # Ajouter le répertoire backend au path si nécessaire
        backend_dir = Path(__file__).parent.parent.parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        
        # Le script sync_emails_periodic utilise sys.path.insert pour ajouter le backend
        # Donc on importe directement depuis scripts
        from scripts.sync_emails_periodic import sync_all_integrations
        
        logger.info("🔄 Déclenchement de la synchronisation inbox via API...")
        
        # Exécuter la synchronisation (la fonction est async)
        await sync_all_integrations()
        
        return {
            "success": True,
            "message": "Synchronisation inbox terminée avec succès",
            "timestamp": datetime.now().isoformat()
        }
        
    except ImportError as e:
        logger.error(f"❌ Erreur d'import lors de la synchronisation inbox: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur d'import: {str(e)}. Vérifiez que le script sync_emails_periodic.py existe."
        )
    except Exception as e:
        logger.error(f"❌ Erreur lors de la synchronisation inbox: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la synchronisation: {str(e)}"
        )


@router.get("/imap/test")
async def test_imap_connection(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    use_ssl: bool = True,
    current_user = Depends(get_current_active_user)
):
    """
    Teste la connexion IMAP sans importer d'emails.
    """
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and super admins can test IMAP"
        )
    
    try:
        import imaplib
        
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        else:
            mail = imaplib.IMAP4(imap_server, imap_port)
        
        mail.login(email_address, password)
        mail.select("INBOX")
        
        # Compter les emails non lus
        status, messages = mail.search(None, "UNSEEN")
        unread_count = len(messages[0].split()) if messages[0] else 0
        
        mail.close()
        mail.logout()
        
        return {
            "status": "success",
            "connection": "ok",
            "unread_emails": unread_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"IMAP connection failed: {str(e)}"
        )

