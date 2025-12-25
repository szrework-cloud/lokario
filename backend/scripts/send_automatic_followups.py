#!/usr/bin/env python3
"""
Script pour envoyer automatiquement les relances configurées.

À exécuter via cron toutes les heures (ou selon vos besoins).

Exemple d'utilisation:
    python scripts/send_automatic_followups.py

Pour cron (toutes les heures):
    0 * * * * cd /path/to/backend && python scripts/send_automatic_followups.py >> logs/followups_auto.log 2>&1
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.followup import FollowUp, FollowUpStatus, FollowUpHistory, FollowUpHistoryStatus, FollowUpType
from app.db.models.client import Client
from app.db.models.user import User
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.vonage_service import VonageSMSService
from app.core.encryption_service import get_encryption_service
from app.core.config import settings
from app.db.models.inbox_integration import InboxIntegration
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_followup_settings(db: Session, company_id: int):
    """Récupère la configuration IA des relances pour une entreprise"""
    from app.db.models.company_settings import CompanySettings
    from app.core.defaults import get_default_settings
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == company_id
    ).first()
    
    if not company_settings:
        return None
    
    settings_dict = company_settings.settings
    followup_settings = settings_dict.get("followups", {})
    
    if not followup_settings:
        return None
    
    return followup_settings


def get_billing_settings(db: Session, company_id: int):
    """Récupère la configuration de facturation pour une entreprise"""
    from app.db.models.company_settings import CompanySettings
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == company_id
    ).first()
    
    if not company_settings:
        return {}
    
    settings_dict = company_settings.settings
    billing_settings = settings_dict.get("billing", {})
    auto_followups = billing_settings.get("auto_followups", {})
    
    return {
        "quotes_enabled": auto_followups.get("quotes_enabled", False),
        "invoices_enabled": auto_followups.get("invoices_enabled", False),
    }


def should_send_followup(followup: FollowUp, db: Session) -> bool:
    """
    Détermine si une relance doit être envoyée maintenant.
    
    Vérifie:
    - Si auto_enabled est True
    - Si le nombre maximum de relances n'est pas atteint
    - Si le délai (auto_frequency_days) depuis la dernière relance est atteint
    - Si les conditions d'arrêt ne sont pas remplies
    - Si les relances "avant" sont activées et que la date est appropriée
    """
    if not followup.auto_enabled:
        return False
    
    if followup.status == FollowUpStatus.FAIT:
        return False
    
    # Vérifier les conditions d'arrêt selon le type de relance
    if followup.type == FollowUpType.DEVIS_NON_REPONDU and followup.source_type == "quote":
        # Vérifier si le devis est signé
        from app.db.models.billing import Quote
        quote = db.query(Quote).filter(Quote.id == followup.source_id).first()
        if quote and (quote.client_signature_path or quote.status.value == "accepté"):
            logger.info(f"Relance {followup.id}: Devis {quote.number} signé, suppression de la relance")
            db.delete(followup)
            db.commit()
            return False
    
    if followup.type == FollowUpType.FACTURE_IMPAYEE and followup.source_type == "invoice":
        # Vérifier si la facture est payée
        from app.db.models.billing import Invoice, InvoiceStatus
        invoice = db.query(Invoice).filter(Invoice.id == followup.source_id).first()
        if invoice and invoice.status == InvoiceStatus.PAYEE:
            logger.info(f"Relance {followup.id}: Facture {invoice.number} payée, arrêt des relances")
            followup.status = FollowUpStatus.FAIT
            db.commit()
            return False
    
    # Récupérer les settings
    settings = get_followup_settings(db, followup.company_id)
    
    # Vérifier d'abord les relances AVANT la due_date (si activées)
    enable_relances_before = settings.get("enable_relances_before", False) if settings else False
    if enable_relances_before:
        due_date = followup.due_date
        if isinstance(due_date, date):
            due_date = datetime.combine(due_date, datetime.min.time())
        
        now = datetime.now()
        time_until_due = due_date - now
        
        days_before_due = settings.get("days_before_due") if settings else None
        hours_before_due = settings.get("hours_before_due") if settings else None
        
        # Vérifier si on est dans la fenêtre pour envoyer une relance "avant"
        should_send_before = False
        
        if days_before_due is not None:
            # Vérifier si on est à X jours avant la due_date
            days_until_due = time_until_due.days
            if 0 <= days_until_due <= days_before_due:
                # Vérifier qu'on n'a pas déjà envoyé une relance "avant" récemment
                recent_before_history = db.query(FollowUpHistory).filter(
                    FollowUpHistory.followup_id == followup.id,
                    FollowUpHistory.sent_at >= now - timedelta(days=1)
                ).first()
                if not recent_before_history:
                    should_send_before = True
                    logger.info(f"Relance {followup.id}: Relance 'avant' déclenchée ({days_until_due} jours avant la due_date)")
        
        if hours_before_due is not None and not should_send_before:
            # Vérifier si on est à X heures avant la due_date
            hours_until_due = time_until_due.total_seconds() / 3600
            if 0 <= hours_until_due <= hours_before_due:
                # Vérifier qu'on n'a pas déjà envoyé une relance "avant" récemment
                recent_before_history = db.query(FollowUpHistory).filter(
                    FollowUpHistory.followup_id == followup.id,
                    FollowUpHistory.sent_at >= now - timedelta(hours=1)
                ).first()
                if not recent_before_history:
                    should_send_before = True
                    logger.info(f"Relance {followup.id}: Relance 'avant' déclenchée ({hours_until_due:.1f} heures avant la due_date)")
        
        if should_send_before:
            return True
    
    # Compter le nombre de relances déjà envoyées (manuelles + automatiques)
    all_history = db.query(FollowUpHistory).filter(
        FollowUpHistory.followup_id == followup.id
    ).order_by(FollowUpHistory.sent_at.asc()).all()
    
    # Récupérer les settings pour vérifier le nombre maximum
    max_relances = settings.get("max_relances", 3) if settings else 3
    
    # Vérifier si on a atteint le nombre maximum de relances
    if len(all_history) >= max_relances:
        logger.info(f"Relance {followup.id}: Nombre maximum de relances atteint ({len(all_history)}/{max_relances})")
        followup.status = FollowUpStatus.FAIT
        db.commit()
        return False
    
    # Vérifier la dernière relance envoyée
    last_history = all_history[-1] if all_history else None
    
    if not last_history:
        # Première relance : vérifier si le délai initial est atteint
        # Utiliser le premier délai de relance_delays au lieu de initial_delay_days
        relance_delays = settings.get("relance_delays", [7, 14, 21]) if settings else [7, 14, 21]
        initial_delay = relance_delays[0] if relance_delays and len(relance_delays) > 0 else (settings.get("initial_delay_days", 7) if settings else 7)
        
        due_date = followup.due_date.date() if isinstance(followup.due_date, datetime) else followup.due_date
        today = date.today()
        days_since_due = (today - due_date).days
        
        logger.info(f"Relance {followup.id}: Première relance, délai requis: {initial_delay} jours (depuis relance_delays[0]), jours écoulés: {days_since_due}")
        
        return days_since_due >= initial_delay
    
    # Relance suivante : vérifier si le délai de fréquence est atteint
    last_sent_date = last_history.sent_at.date() if isinstance(last_history.sent_at, datetime) else last_history.sent_at
    today = date.today()
    days_since_last = (today - last_sent_date).days
    
    # Utiliser le délai approprié selon le nombre de relances déjà envoyées
    relance_delays = settings.get("relance_delays", [7, 14, 21]) if settings else [7, 14, 21]
    relance_index = len(all_history) - 1  # Index de la prochaine relance (0-based)
    
    if relance_index < len(relance_delays):
        frequency_days = relance_delays[relance_index]
    else:
        # Si on dépasse la liste, utiliser le dernier délai
        frequency_days = relance_delays[-1] if relance_delays else 7
    
    logger.info(f"Relance {followup.id}: {len(all_history)} relance(s) déjà envoyée(s), délai requis: {frequency_days} jours, jours écoulés: {days_since_last}")
    
    return days_since_last >= frequency_days


def generate_followup_message(followup: FollowUp, db: Session) -> str:
    """Génère un message de relance en utilisant les templates configurés"""
    try:
        from app.db.models.company_settings import CompanySettings
        from app.db.models.inbox_integration import InboxIntegration
        from app.db.models.company import Company
        
        # Convertir le type enum en string pour les comparaisons
        followup_type_str = str(followup.type) if followup.type else ""
        followup_type_lower = followup_type_str.lower()
        
        client_name = followup.client.name if followup.client else "Client"
        amount = float(followup.amount) if followup.amount else None
        
        # Récupérer les informations de l'entreprise
        # Priorité : settings.company_info > intégrations inbox > valeurs par défaut
        company_name = "Notre entreprise"
        company_email = None
        company_phone = None
        
        try:
            # Récupérer le nom de l'entreprise
            from app.db.models.company import Company
            company = db.query(Company).filter(Company.id == followup.company_id).first()
            if company:
                company_name = company.name
            
            # D'abord, essayer de récupérer depuis les settings (company_info)
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == followup.company_id
            ).first()
            
            if company_settings:
                settings_dict = company_settings.settings
                company_info = settings_dict.get("company_info", {})
                
                # Email depuis settings (priorité 1)
                if company_info.get("email"):
                    company_email = company_info.get("email")
                
                # Téléphone depuis settings si disponible (à ajouter plus tard)
                if company_info.get("phone"):
                    company_phone = company_info.get("phone")
            
            # Si pas d'email dans settings, utiliser l'intégration inbox principale (priorité 2)
            if not company_email:
                primary_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == followup.company_id,
                    InboxIntegration.is_primary == True,
                    InboxIntegration.is_active == True,
                    InboxIntegration.integration_type == "imap"
                ).first()
                
                if primary_integration and primary_integration.email_address:
                    company_email = primary_integration.email_address
                    # Ne pas écraser le nom de l'entreprise avec primary_integration.name
                    # Le nom doit venir de company.name
            
            # Si pas de téléphone dans settings, utiliser l'intégration SMS/Vonage (priorité 2)
            if not company_phone:
                # Chercher d'abord une intégration SMS (type "sms")
                vonage_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == followup.company_id,
                    InboxIntegration.integration_type == "sms",
                    InboxIntegration.is_active == True
                ).first()
                
                # Si pas trouvé, chercher une intégration WhatsApp (rétrocompatibilité)
                if not vonage_integration:
                    vonage_integration = db.query(InboxIntegration).filter(
                        InboxIntegration.company_id == followup.company_id,
                        InboxIntegration.integration_type == "whatsapp",
                        InboxIntegration.is_active == True
                    ).first()
                
                if vonage_integration and vonage_integration.phone_number:
                    company_phone = vonage_integration.phone_number
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération des infos entreprise: {e}")
        
        # Récupérer le template pour ce type de relance
        template_content = None
        template_method = None
        try:
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == followup.company_id
            ).first()
            
            if company_settings:
                settings_dict = company_settings.settings
                followup_settings = settings_dict.get("followups", {})
                messages = followup_settings.get("messages", [])
                
                # Chercher le template correspondant au type de relance
                # followup_type_str est déjà défini au début de la fonction
                for msg_template in messages:
                    if isinstance(msg_template, dict) and msg_template.get("type") == followup_type_str:
                        template_content = msg_template.get("content")
                        template_method = msg_template.get("method", "email")  # Récupérer la méthode du template
                        break
                
                # Si aucun template trouvé dans les settings, utiliser les templates par défaut
                if not template_content:
                    from app.api.routes.followups import get_default_followup_templates
                    default_templates = get_default_followup_templates()
                    for default_template in default_templates:
                        if default_template.type == followup_type_str:
                            template_content = default_template.content
                            logger.info(f"Utilisation du template par défaut pour '{followup_type_str}' (relance {followup.id})")
                            break
        except Exception as e:
            logger.warning(f"Erreur lors de la récupération du template: {e}")
        
        # Utiliser le template ou un message par défaut
        if template_content:
            # Remplacer les variables dans le template
            message = template_content
            message = message.replace("{client_name}", client_name)
            # Générer un label descriptif basé sur le type de relance si source_label contient juste l'email/téléphone
            source_label = followup.source_label
            if not source_label or source_label.startswith("Relance manuelle -") or "@" in source_label or (len(source_label) > 0 and source_label.replace("+", "").replace(" ", "").replace("-", "").isdigit()):
                # Générer un label approprié selon le type (utiliser la string pour la comparaison)
                if "devis" in followup_type_lower:
                    source_label = "votre devis"
                elif "facture" in followup_type_lower:
                    source_label = "votre facture"
                elif "info" in followup_type_lower:
                    source_label = "votre dossier"
                elif "rdv" in followup_type_lower or "rendez-vous" in followup_type_lower:
                    source_label = "votre rendez-vous"
                elif "projet" in followup_type_lower:
                    source_label = "votre projet"
                elif "client" in followup_type_lower:
                    source_label = "votre dossier"
                else:
                    source_label = "votre dossier"
            
            message = message.replace("{source_label}", source_label)
            message = message.replace("{company_name}", company_name)
            message = message.replace("{company_email}", company_email or "")
            message = message.replace("{company_phone}", company_phone or "")
            
            # Récupérer les informations supplémentaires depuis company_info
            company_info = {}
            try:
                company_settings = db.query(CompanySettings).filter(
                    CompanySettings.company_id == followup.company_id
                ).first()
                if company_settings:
                    settings_dict = company_settings.settings
                    company_info = settings_dict.get("company_info", {})
            except Exception as e:
                logger.warning(f"Erreur lors de la récupération de company_info: {e}")
            
            # Remplacer les variables supplémentaires
            message = message.replace("{company_address}", company_info.get("address") or "")
            message = message.replace("{company_city}", company_info.get("city") or "")
            message = message.replace("{company_postal_code}", company_info.get("postal_code") or "")
            message = message.replace("{company_country}", company_info.get("country") or "")
            message = message.replace("{company_siren}", company_info.get("siren") or "")
            message = message.replace("{company_siret}", company_info.get("siret") or "")
            message = message.replace("{company_vat_number}", company_info.get("vat_number") or "")
            
            # Si company_phone n'était pas défini, essayer depuis company_info
            if not company_phone and company_info.get("phone"):
                company_phone = company_info.get("phone")
                message = message.replace("{company_phone}", company_phone)
            if amount:
                message = message.replace("{amount}", f"{amount:.2f}")
            else:
                message = message.replace("{amount}", "")
            
            # Remplacer {signature_link} si c'est une relance de devis
            if "{signature_link}" in message and followup.source_type == "quote" and followup.source_id:
                try:
                    from app.db.models.billing import Quote
                    from app.core.config import settings
                    
                    quote = db.query(Quote).filter(Quote.id == followup.source_id).first()
                    if quote and quote.public_token:
                        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                        signature_link = f"{frontend_url}/quote/{quote.public_token}"
                        message = message.replace("{signature_link}", signature_link)
                        logger.info(f"Lien de signature ajouté pour devis {quote.number}: {signature_link}")
                    else:
                        # Si pas de token, enlever la variable
                        message = message.replace("{signature_link}", "")
                except Exception as e:
                    logger.warning(f"Erreur lors de la récupération du lien de signature: {e}")
                    message = message.replace("{signature_link}", "")
            
            logger.info(f"Template utilisé pour la relance {followup.id} (type: {followup.type})")
            return message
        else:
            # Message par défaut si pas de template
            logger.info(f"Aucun template trouvé pour le type '{followup.type}', utilisation d'un message par défaut")
            # Générer un label descriptif basé sur le type de relance
            source_label = followup.source_label
            followup_type_lower = followup_type_str.lower()
            if not source_label or source_label.startswith("Relance manuelle -") or "@" in source_label or (len(source_label) > 0 and source_label.replace("+", "").replace(" ", "").replace("-", "").isdigit()):
                # Générer un label approprié selon le type (utiliser la string pour la comparaison)
                if "devis" in followup_type_lower:
                    source_label = "votre devis"
                elif "facture" in followup_type_lower:
                    source_label = "votre facture"
                elif "info" in followup_type_lower:
                    source_label = "votre dossier"
                elif "rdv" in followup_type_lower or "rendez-vous" in followup_type_lower:
                    source_label = "votre rendez-vous"
                elif "projet" in followup_type_lower:
                    source_label = "votre projet"
                elif "client" in followup_type_lower:
                    source_label = "votre dossier"
                else:
                    source_label = "votre dossier"
            
            if "devis" in followup_type_lower:
                return f"Bonjour {client_name},\n\nNous vous rappelons que votre devis concernant {source_label} est en attente de réponse.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n{company_name}"
            elif "facture" in followup_type_lower:
                amount_str = f" d'un montant de {amount} €" if amount else ""
                return f"Bonjour {client_name},\n\nNous vous rappelons que votre facture concernant {source_label}{amount_str} est en attente de règlement.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n{company_name}"
            else:
                return f"Bonjour {client_name},\n\nNous vous contactons concernant {source_label}.\n\nCordialement,\n{company_name}"
            
    except Exception as e:
        logger.error(f"Erreur lors de la génération du message pour la relance {followup.id}: {e}")
        return f"Relance concernant {followup.source_label}"


def send_followup_via_inbox(followup: FollowUp, message: str, method: str, db: Session) -> tuple[bool, Optional[int]]:
    """
    Envoie une relance via le système inbox (unifié avec l'endpoint).
    Retourne (success, conversation_id)
    """
    try:
        from app.db.models.conversation import Conversation, InboxMessage
        
        if not followup.client:
            logger.warning(f"Relance {followup.id}: Pas de client associé")
            return False, None
        
        # Chercher ou créer une conversation inbox
        existing_conversation = db.query(Conversation).filter(
            Conversation.company_id == followup.company_id,
            Conversation.client_id == followup.client_id,
            Conversation.source == method  # email, sms, whatsapp
        ).order_by(Conversation.created_at.desc()).first()
        
        if existing_conversation:
            conversation_id = existing_conversation.id
            conversation = existing_conversation
            logger.info(f"Relance {followup.id}: Conversation existante trouvée: {conversation_id}")
        else:
            # Créer une nouvelle conversation
            conversation = Conversation(
                company_id=followup.company_id,
                client_id=followup.client_id,
                subject=f"Relance automatique - {followup.source_label}",
                status="À répondre",
                source=method,
                unread_count=0,
                last_message_at=datetime.now()
            )
            db.add(conversation)
            db.flush()
            conversation_id = conversation.id
            logger.info(f"Relance {followup.id}: Nouvelle conversation créée: {conversation_id}")
        
        # Récupérer l'adresse email ou téléphone de l'expéditeur
        from_email = None
        from_phone = None
        from_name = "Système automatique"
        
        if method == "email":
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == followup.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            if primary_integration:
                from_email = primary_integration.email_address
                from_name = primary_integration.name or from_name
        elif method in ["sms", "whatsapp"]:
            # Chercher d'abord une intégration SMS (type "sms")
            vonage_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == followup.company_id,
                InboxIntegration.integration_type == "sms",
                InboxIntegration.is_active == True
            ).first()
            
            # Si pas trouvé, chercher une intégration WhatsApp (rétrocompatibilité)
            if not vonage_integration:
                vonage_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == followup.company_id,
                    InboxIntegration.integration_type == "whatsapp",
                    InboxIntegration.is_active == True
                ).first()
            
            if vonage_integration:
                from_phone = vonage_integration.phone_number
        
        # Ajouter le message dans la conversation
        inbox_message = InboxMessage(
            conversation_id=conversation_id,
            from_name=from_name,
            from_email=from_email,
            from_phone=from_phone,
            content=message,
            source=method,
            is_from_client=False,  # C'est l'entreprise qui envoie
            read=True
        )
        db.add(inbox_message)
        db.flush()
        
        # Mettre à jour la conversation
        conversation.last_message_at = datetime.now()
        
        # Envoyer l'email/SMS via la logique inbox (comme dans create_message)
        success = False
        if method == "email" and conversation.source == "email":
            try:
                primary_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == followup.company_id,
                    InboxIntegration.is_primary == True,
                    InboxIntegration.is_active == True,
                    InboxIntegration.integration_type == "imap"
                ).first()
                
                if primary_integration and primary_integration.email_address and primary_integration.email_password:
                    to_email = followup.client.email
                    if to_email:
                        encryption_service = get_encryption_service()
                        email_password = encryption_service.decrypt(primary_integration.email_password) if primary_integration.email_password else None
                        
                        if email_password:
                            smtp_config = get_smtp_config(primary_integration.email_address)
                            send_email_smtp(
                                smtp_server=smtp_config["smtp_server"],
                                smtp_port=smtp_config["smtp_port"],
                                email_address=primary_integration.email_address,
                                password=email_password,
                                to_email=to_email,
                                subject=conversation.subject or "Relance",
                                content=message,
                                use_tls=smtp_config["use_tls"],
                                from_name=from_name
                            )
                            success = True
                            logger.info(f"✅ Email envoyé via inbox à {to_email} pour la relance {followup.id}")
            except Exception as e:
                logger.error(f"Erreur lors de l'envoi de l'email pour la relance {followup.id}: {e}", exc_info=True)
        
        elif method in ["sms", "whatsapp"] and conversation.source in ["sms", "whatsapp"]:
            try:
                # Chercher d'abord une intégration SMS (type "sms")
                vonage_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == followup.company_id,
                    InboxIntegration.integration_type == "sms",
                    InboxIntegration.is_active == True
                ).first()
                
                # Si pas trouvé, chercher une intégration WhatsApp (rétrocompatibilité)
                if not vonage_integration:
                    vonage_integration = db.query(InboxIntegration).filter(
                        InboxIntegration.company_id == followup.company_id,
                        InboxIntegration.integration_type == "whatsapp",
                        InboxIntegration.is_active == True
                    ).first()
                
                # Vérifier toutes les conditions nécessaires
                if not vonage_integration:
                    logger.error(f"Relance {followup.id}: ❌ Aucune intégration SMS trouvée")
                elif not vonage_integration.api_key:
                    logger.error(f"Relance {followup.id}: ❌ API Key manquante dans l'intégration SMS")
                elif not vonage_integration.webhook_secret:
                    logger.error(f"Relance {followup.id}: ❌ API Secret (webhook_secret) manquant dans l'intégration SMS")
                elif not vonage_integration.phone_number:
                    logger.error(f"Relance {followup.id}: ❌ Numéro de téléphone manquant dans l'intégration SMS")
                elif not followup.client or not followup.client.phone:
                    logger.error(f"Relance {followup.id}: ❌ Numéro de téléphone client manquant")
                else:
                    # Toutes les conditions sont remplies, on peut envoyer
                    encryption_service = get_encryption_service()
                    api_key = encryption_service.decrypt(vonage_integration.api_key) if vonage_integration.api_key else None
                    api_secret = encryption_service.decrypt(vonage_integration.webhook_secret) if vonage_integration.webhook_secret else None
                    
                    if not api_key or not api_secret:
                        logger.error(f"Relance {followup.id}: ❌ Impossible de décrypter les credentials Vonage")
                    else:
                        vonage_service = VonageSMSService(api_key=api_key, api_secret=api_secret)
                        result = vonage_service.send_sms(
                            to=followup.client.phone,
                            message=message,
                            from_number=vonage_integration.phone_number
                        )
                        if result.get("success"):
                            inbox_message.external_id = result.get("message_id")
                            inbox_message.external_metadata = {"vonage_message_id": result.get("message_id"), "provider": "vonage"}
                            success = True
                            logger.info(f"✅ SMS envoyé via inbox à {followup.client.phone} pour la relance {followup.id}")
                        else:
                            logger.error(f"Relance {followup.id}: ❌ Échec de l'envoi SMS: {result.get('error', 'Erreur inconnue')}")
            except Exception as e:
                logger.error(f"Erreur lors de l'envoi du SMS pour la relance {followup.id}: {e}", exc_info=True)
        
        return success, conversation_id
        
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de la relance via inbox {followup.id}: {e}", exc_info=True)
        return False, None


def create_automatic_followups_for_quotes(db: Session):
    """Crée automatiquement des relances pour les devis non signés"""
    from app.db.models.billing import Quote, QuoteStatus
    from app.db.models.company import Company
    from sqlalchemy import or_
    
    # Récupérer toutes les entreprises
    companies = db.query(Company).all()
    
    created_count = 0
    
    for company in companies:
        billing_settings = get_billing_settings(db, company.id)
        if not billing_settings.get("quotes_enabled", False):
            continue
        
        # Récupérer les paramètres de relances
        followup_settings = get_followup_settings(db, company.id)
        if not followup_settings:
            continue
        
        relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
        initial_delay = relance_delays[0] if relance_delays else 7
        
        # Récupérer les devis envoyés non signés (uniquement les devis ENVOYE, pas les brouillons)
        quotes = db.query(Quote).filter(
            Quote.company_id == company.id,
            Quote.status == QuoteStatus.ENVOYE  # Uniquement les devis envoyés (pas les brouillons)
        ).filter(
            Quote.client_signature_path.is_(None)  # Non signés
        ).all()
        
        logger.info(f"Entreprise {company.id}: {len(quotes)} devis envoyé(s) non signé(s) trouvé(s)")
        
        for quote in quotes:
            # Vérifier si le devis est toujours non signé (double vérification)
            if quote.client_signature_path or quote.status == QuoteStatus.ACCEPTE:
                logger.info(f"Devis {quote.number} (ID: {quote.id}) déjà signé, ignoré")
                continue
            
            # Vérifier si une relance existe déjà pour ce devis
            existing_followup = db.query(FollowUp).filter(
                FollowUp.company_id == company.id,
                FollowUp.source_type == "quote",
                FollowUp.source_id == quote.id,
                FollowUp.type == FollowUpType.DEVIS_NON_REPONDU
            ).first()
            
            if existing_followup:
                logger.info(f"Relance déjà existante pour devis {quote.number} (ID: {quote.id})")
                continue
            
            # Calculer la due_date : si le devis a été envoyé, utiliser sent_at + délai initial
            # Sinon, utiliser maintenant + délai initial
            if quote.sent_at:
                days_since_sent = (datetime.now() - quote.sent_at).days
                if days_since_sent >= initial_delay:
                    # Le délai est déjà atteint, la relance peut être envoyée immédiatement
                    due_date = datetime.now()
                else:
                    # Le délai n'est pas encore atteint, calculer la date future
                    due_date = quote.sent_at + timedelta(days=initial_delay)
            else:
                # Pas de date d'envoi, utiliser maintenant + délai
                due_date = datetime.now() + timedelta(days=initial_delay)
            
            # Créer la relance (même si le délai n'est pas encore atteint)
            followup = FollowUp(
                company_id=company.id,
                client_id=quote.client_id,
                type=FollowUpType.DEVIS_NON_REPONDU,
                source_type="quote",
                source_id=quote.id,
                source_label=f"Devis {quote.number}",
                due_date=due_date,
                actual_date=datetime.now(),
                status=FollowUpStatus.A_FAIRE,
                amount=float(quote.total_ttc) if quote.total_ttc else None,
                auto_enabled=True,
                auto_stop_on_response=True,
                auto_stop_on_refused=True
            )
            db.add(followup)
            created_count += 1
            logger.info(f"✅ Relance automatique créée pour devis {quote.number} (ID: {quote.id})")
    
    if created_count > 0:
        db.commit()
        logger.info(f"✅ {created_count} relance(s) automatique(s) créée(s) pour les devis non signés")
    
    return created_count


def create_automatic_followups_for_invoices(db: Session):
    """Crée automatiquement des relances pour les factures impayées"""
    from app.db.models.billing import Invoice, InvoiceStatus, InvoiceType
    from app.db.models.company import Company
    
    # Récupérer toutes les entreprises
    companies = db.query(Company).all()
    
    created_count = 0
    
    for company in companies:
        billing_settings = get_billing_settings(db, company.id)
        if not billing_settings.get("invoices_enabled", False):
            continue
        
        # Récupérer les paramètres de relances
        followup_settings = get_followup_settings(db, company.id)
        if not followup_settings:
            continue
        
        relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
        max_relances = followup_settings.get("max_relances", 3)
        initial_delay = relance_delays[0] if relance_delays else 7
        
        # Récupérer les factures impayées (non payées et non annulées, exclure les avoirs)
        invoices = db.query(Invoice).filter(
            Invoice.company_id == company.id,
            Invoice.invoice_type == InvoiceType.FACTURE,  # Exclure les avoirs
            Invoice.status.in_([InvoiceStatus.ENVOYEE, InvoiceStatus.IMPAYEE, InvoiceStatus.EN_RETARD]),
            Invoice.deleted_at.is_(None)
        ).all()
        
        logger.info(f"Entreprise {company.id}: {len(invoices)} facture(s) impayée(s) trouvée(s)")
        
        for invoice in invoices:
            # Vérifier si la facture est toujours impayée (double vérification)
            if invoice.status == InvoiceStatus.PAYEE:
                logger.info(f"Facture {invoice.number} (ID: {invoice.id}) déjà payée, ignorée")
                continue
            
            # Vérifier si une relance existe déjà pour cette facture
            existing_followup = db.query(FollowUp).filter(
                FollowUp.company_id == company.id,
                FollowUp.source_type == "invoice",
                FollowUp.source_id == invoice.id,
                FollowUp.type == FollowUpType.FACTURE_IMPAYEE
            ).first()
            
            if existing_followup:
                # Vérifier si le nombre max de relances est atteint
                history_count = db.query(FollowUpHistory).filter(
                    FollowUpHistory.followup_id == existing_followup.id,
                    FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
                ).count()
                
                if history_count >= max_relances:
                    existing_followup.status = FollowUpStatus.FAIT
                    db.commit()
                    logger.info(f"Relance pour facture {invoice.number} (ID: {invoice.id}): nombre max atteint ({history_count}/{max_relances})")
                    continue
                logger.info(f"Relance déjà existante pour facture {invoice.number} (ID: {invoice.id})")
                continue
            
            # Calculer la due_date : si la facture a été envoyée, utiliser sent_at + délai initial
            # Sinon, utiliser maintenant + délai initial
            if invoice.sent_at:
                days_since_sent = (datetime.now() - invoice.sent_at).days
                if days_since_sent >= initial_delay:
                    # Le délai est déjà atteint, la relance peut être envoyée immédiatement
                    due_date = datetime.now()
                else:
                    # Le délai n'est pas encore atteint, calculer la date future
                    due_date = invoice.sent_at + timedelta(days=initial_delay)
            else:
                # Pas de date d'envoi, utiliser maintenant + délai
                due_date = datetime.now() + timedelta(days=initial_delay)
            
            # Créer la relance (même si le délai n'est pas encore atteint)
            followup = FollowUp(
                company_id=company.id,
                client_id=invoice.client_id,
                type=FollowUpType.FACTURE_IMPAYEE,
                source_type="invoice",
                source_id=invoice.id,
                source_label=f"Facture {invoice.number}",
                due_date=due_date,
                actual_date=datetime.now(),
                status=FollowUpStatus.A_FAIRE,
                amount=float(invoice.total_ttc) if invoice.total_ttc else None,
                auto_enabled=True,
                auto_stop_on_paid=True
            )
            db.add(followup)
            created_count += 1
            logger.info(f"✅ Relance automatique créée pour facture {invoice.number} (ID: {invoice.id})")
    
    if created_count > 0:
        db.commit()
        logger.info(f"✅ {created_count} relance(s) automatique(s) créée(s) pour les factures impayées")
    
    return created_count


def process_automatic_followups():
    """Traite toutes les relances automatiques à envoyer"""
    db: Session = SessionLocal()
    
    try:
        logger.info("🔄 Démarrage du traitement des relances automatiques...")
        
        # Étape 1: Créer automatiquement des relances pour devis non signés et factures impayées
        logger.info("📝 Création des relances automatiques pour devis non signés...")
        quotes_created = create_automatic_followups_for_quotes(db)
        
        logger.info("📝 Création des relances automatiques pour factures impayées...")
        invoices_created = create_automatic_followups_for_invoices(db)
        
        # Étape 2: Traiter les relances existantes
        # Récupérer toutes les relances avec auto_enabled = True et status != FAIT
        followups = db.query(FollowUp).filter(
            FollowUp.auto_enabled == True,
            FollowUp.status != FollowUpStatus.FAIT
        ).all()
        
        logger.info(f"📋 {len(followups)} relance(s) avec automatisation activée trouvée(s)")
        
        stats = {
            "processed": 0,
            "sent": 0,
            "skipped": 0,
            "errors": 0
        }
        
        for followup in followups:
            try:
                stats["processed"] += 1
                
                # Vérifier si la relance doit être envoyée
                if not should_send_followup(followup, db):
                    stats["skipped"] += 1
                    continue
                
                logger.info(f"📤 Envoi de la relance {followup.id} (Type: {followup.type}, Client: {followup.client_id})")
                
                # Vérifier les limites de relances selon le plan
                from app.core.subscription_limits import check_followups_limit
                is_allowed, error_message = check_followups_limit(db, followup.company_id)
                if not is_allowed:
                    logger.warning(f"⚠️ Limite de relances atteinte pour entreprise {followup.company_id}: {error_message}")
                    stats["skipped"] += 1
                    continue
                
                # Récupérer la configuration pour déterminer la méthode d'envoi depuis le template
                settings = get_followup_settings(db, followup.company_id)
                template_method = None
                
                # Récupérer la méthode du template pour ce type de relance
                if settings:
                    messages = settings.get("messages", [])
                    followup_type_str = str(followup.type) if followup.type else ""
                    for msg_template in messages:
                        if isinstance(msg_template, dict) and msg_template.get("type") == followup_type_str:
                            template_method = msg_template.get("method", "email")
                            break
                
                # Utiliser la méthode du template, ou "email" par défaut
                method = template_method if template_method else "email"
                logger.info(f"Relance {followup.id}: Méthode d'envoi déterminée depuis le template: {method}")
                
                # Générer le message
                message = generate_followup_message(followup, db)
                
                # Envoyer la relance via inbox (unifié avec l'endpoint)
                success, conversation_id = send_followup_via_inbox(followup, message, method, db)
                
                if success:
                    # Créer l'entrée d'historique
                    history = FollowUpHistory(
                        followup_id=followup.id,
                        company_id=followup.company_id,
                        message=message,
                        message_type=method,
                        status=FollowUpHistoryStatus.ENVOYE,
                        sent_by_id=None,  # Automatique
                        sent_by_name="Système automatique",
                        sent_at=datetime.now(),
                        conversation_id=conversation_id  # Lier à la conversation inbox
                    )
                    
                    db.add(history)
                    db.flush()  # Flush pour avoir l'ID de l'historique
                    
                    # Mettre à jour le statut et la due_date de la relance (comme dans l'endpoint send_followup)
                    total_sent = db.query(FollowUpHistory).filter(
                        FollowUpHistory.followup_id == followup.id,
                        FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
                    ).count()
                    
                    max_relances = settings.get("max_relances", 3) if settings else 3
                    relance_delays = settings.get("relance_delays", [7, 14, 21]) if settings else [7, 14, 21]
                    
                    remaining_relances = max_relances - total_sent
                    
                    if remaining_relances > 0:
                        # Calculer le délai pour la prochaine relance
                        delay_index = min(total_sent - 1, len(relance_delays) - 1)
                        next_delay_days = relance_delays[delay_index] if delay_index >= 0 else relance_delays[0]
                        
                        logger.info(f"Relance {followup.id}: Configuration des délais - total_sent: {total_sent}, delay_index: {delay_index}, relance_delays: {relance_delays}, délai utilisé: {next_delay_days} jours")
                        
                        # Mettre à jour la due_date pour la prochaine relance
                        next_due_date = datetime.now() + timedelta(days=next_delay_days)
                        followup.due_date = next_due_date
                        followup.actual_date = datetime.now()
                        followup.status = FollowUpStatus.A_FAIRE
                        
                        logger.info(f"✅ Relance {followup.id} #{total_sent}/{max_relances} envoyée, prochaine relance dans {next_delay_days} jours (le {next_due_date.strftime('%Y-%m-%d')})")
                    else:
                        # Toutes les relances ont été envoyées
                        followup.status = FollowUpStatus.FAIT
                        logger.info(f"✅ Relance {followup.id}: Toutes les relances automatiques ont été envoyées ({total_sent}/{max_relances}), statut: 'Fait'")
                    
                    db.commit()
                    
                    stats["sent"] += 1
                    logger.info(f"✅ Relance {followup.id} envoyée avec succès (conversation: {conversation_id or 'N/A'})")
                else:
                    stats["errors"] += 1
                    logger.error(f"❌ Échec d'envoi de la relance {followup.id}")
                    
            except Exception as e:
                stats["errors"] += 1
                logger.error(f"❌ Erreur lors du traitement de la relance {followup.id}: {e}", exc_info=True)
                db.rollback()
        
        logger.info(f"✅ Traitement terminé: {stats['sent']} envoyée(s), {stats['skipped']} ignorée(s), {stats['errors']} erreur(s)")
        
    except Exception as e:
        logger.error(f"❌ Erreur globale lors du traitement des relances automatiques: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    process_automatic_followups()
