"""
Route API pour le formulaire de contact public.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("")
async def send_contact_email(contact: ContactForm):
    """
    Envoie un email de contact depuis le formulaire public.
    
    L'email est envoyé à lokario.saas@gmail.com avec les informations du formulaire.
    """
    try:
        # Email de destination (votre email)
        to_email = "lokario.saas@gmail.com"
        
        # Préparer le contenu de l'email
        email_subject = f"[Contact Lokario] {contact.subject}"
        email_body = f"""
Bonjour,

Vous avez reçu un nouveau message depuis le formulaire de contact de Lokario :

Nom : {contact.name}
Email : {contact.email}
Sujet : {contact.subject}

Message :
{contact.message}

---
Cet email a été envoyé depuis le formulaire de contact de Lokario.
"""
        
        # Vérifier si SMTP est configuré
        if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.warning("⚠️ SMTP non configuré - Email de contact non envoyé (mode MOCK)")
            logger.info(f"[MOCK] Email de contact reçu de {contact.name} ({contact.email})")
            logger.info(f"[MOCK] Sujet: {contact.subject}")
            logger.info(f"[MOCK] Message: {contact.message}")
            
            # En mode développement, on retourne quand même un succès
            return {
                "message": "Message reçu (mode développement - email non envoyé)",
                "status": "success"
            }
        
        # Obtenir la configuration SMTP
        smtp_config = get_smtp_config(settings.SMTP_USERNAME)
        
        # Envoyer l'email avec Reply-To pour que les réponses aillent directement à l'utilisateur
        success = send_email_smtp(
            smtp_server=smtp_config["smtp_server"],
            smtp_port=smtp_config["smtp_port"],
            email_address=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            to_email=to_email,
            subject=email_subject,
            content=email_body,
            use_tls=smtp_config["use_tls"],
            from_name="Lokario Contact Form",
            reply_to=contact.email  # Les réponses iront directement à l'utilisateur
        )
        
        if success:
            logger.info(f"✅ Email de contact envoyé avec succès de {contact.email} à {to_email}")
            return {
                "message": "Message envoyé avec succès",
                "status": "success"
            }
        else:
            logger.error(f"❌ Échec de l'envoi de l'email de contact de {contact.email}")
            raise HTTPException(
                status_code=500,
                detail="Impossible d'envoyer l'email. Veuillez réessayer plus tard."
            )
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'envoi de l'email de contact: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'envoi de l'email: {str(e)}"
        )
