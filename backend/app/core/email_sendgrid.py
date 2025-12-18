"""
Fonctions helper pour l'envoi d'emails via SendGrid API REST.
"""
import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, Content
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_email_via_sendgrid_api(
    email: str,
    verification_url: str,
    full_name: Optional[str],
    token: str,
    email_type: str
) -> bool:
    """
    Envoie un email via l'API REST SendGrid.
    
    Args:
        email: Email du destinataire
        verification_url: URL de vérification
        full_name: Nom complet (optionnel)
        token: Token de vérification
        email_type: Type d'email ('verification' ou 'password_reset')
    
    Returns:
        True si envoyé avec succès, False sinon
    """
    try:
        logger.info(f"📧 [SENDGRID API] Utilisation de l'API REST SendGrid")
        logger.info(f"📧 [SENDGRID API] Envoi à {email}")
        
        # Créer le client SendGrid
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        
        # Contenu texte
        text_content = f"""
Bonjour {full_name or 'Utilisateur'},

Merci de vous être inscrit sur Lokario !

Pour activer votre compte, veuillez cliquer sur le lien suivant :
{verification_url}

Ce lien est valide pendant 24 heures.

Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

Cordialement,
L'équipe Lokario
"""
        
        # Contenu HTML
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #F97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #F97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #64748B; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bienvenue sur Lokario</h1>
        </div>
        <div class="content">
            <p>Bonjour {full_name or 'Utilisateur'},</p>
            <p>Merci de vous être inscrit sur Lokario !</p>
            <p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Vérifier mon email</a>
            </p>
            <p>Ou copiez-collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #64748B; font-size: 12px;">{verification_url}</p>
            <p><strong>Ce lien est valide pendant 24 heures.</strong></p>
            <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
        </div>
        <div class="footer">
            <p>Cordialement,<br>L'équipe Lokario</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Créer le message
        message = Mail(
            from_email=Email(settings.SMTP_FROM_EMAIL, "Lokario"),
            to_emails=email,
            subject="Vérifiez votre adresse email - Lokario",
            plain_text_content=Content("text/plain", text_content),
            html_content=Content("text/html", html_content)
        )
        
        # Envoyer
        logger.info(f"📧 [SENDGRID API] Envoi du message...")
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"✅ [SENDGRID API] Email envoyé avec succès (status: {response.status_code})")
            return True
        else:
            logger.error(f"❌ [SENDGRID API] Erreur lors de l'envoi (status: {response.status_code})")
            logger.error(f"   Body: {response.body}")
            return False
            
    except Exception as e:
        logger.error(f"❌ [SENDGRID API] Erreur lors de l'envoi: {e}")
        logger.error(f"   Type: {type(e).__name__}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return False
