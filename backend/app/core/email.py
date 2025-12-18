"""
Service d'envoi d'emails pour l'application.
"""
import smtplib
import secrets
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_verification_token() -> str:
    """
    Génère un token de vérification sécurisé (32 caractères hexadécimaux).
    """
    return secrets.token_urlsafe(32)


def get_verification_token_expiry() -> datetime:
    """
    Retourne la date d'expiration du token (24 heures à partir de maintenant).
    """
    return datetime.utcnow() + timedelta(hours=24)


def send_verification_email(
    email: str,
    token: str,
    full_name: Optional[str] = None
) -> bool:
    """
    Envoie un email de vérification à l'utilisateur.
    
    Args:
        email: L'adresse email du destinataire
        token: Le token de vérification
        full_name: Le nom complet de l'utilisateur (optionnel)
    
    Returns:
        True si l'email a été envoyé avec succès, False sinon
    """
    logger.info(f"📧 [EMAIL] Début de l'envoi d'email de vérification à {email}")
    
    # Si pas de configuration SMTP, simuler l'envoi (mode développement)
    if not hasattr(settings, 'SMTP_HOST') or not settings.SMTP_HOST:
        logger.warning("="*80)
        logger.warning("📧 [MOCK EMAIL] Email de vérification")
        logger.warning("="*80)
        logger.warning(f"Destinataire: {email}")
        if full_name:
            logger.warning(f"Nom: {full_name}")
        logger.warning(f"Token de vérification: {token}")
        logger.warning(f"Lien de vérification: {settings.FRONTEND_URL}/verify-email/{token}")
        logger.warning("="*80)
        return True
    
    try:
        # Construire le message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Vérifiez votre adresse email - Lokario"
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = email
        
        # URL de vérification
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        
        # Corps du message en texte brut
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
        
        # Corps du message en HTML
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
        
        # Attacher les deux versions
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # Envoyer l'email
        logger.info(f"📧 [EMAIL] Connexion à {settings.SMTP_HOST}:{settings.SMTP_PORT}...")
        # Utiliser SMTP_SSL pour le port 465 (SSL direct) ou SMTP pour le port 587 (TLS)
        if settings.SMTP_PORT == 465:
            # Port 465 : utiliser SSL directement
            logger.info(f"📧 [EMAIL] Utilisation du port 465 (SSL direct)")
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    logger.info(f"📧 [EMAIL] Authentification avec {settings.SMTP_USERNAME}...")
                    # Supprimer les espaces du mot de passe (Gmail génère avec espaces)
                    password_clean = settings.SMTP_PASSWORD.replace(" ", "")
                    server.login(settings.SMTP_USERNAME, password_clean)
                    logger.info(f"📧 [EMAIL] Authentification réussie")
                logger.info(f"📧 [EMAIL] Envoi du message...")
                server.send_message(msg)
                logger.info(f"📧 [EMAIL] Message envoyé avec succès")
        else:
            # Port 587 ou autres : utiliser STARTTLS
            logger.info(f"📧 [EMAIL] Utilisation du port {settings.SMTP_PORT} (STARTTLS)")
            logger.info(f"📧 [EMAIL] Tentative de connexion SMTP (timeout: 30s)...")
            try:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
                logger.info(f"📧 [EMAIL] Connexion SMTP établie avec succès")
            except Exception as conn_error:
                logger.error(f"❌ [EMAIL] Erreur lors de la connexion SMTP: {conn_error}")
                logger.error(f"   Type: {type(conn_error).__name__}")
                raise
            
                if settings.SMTP_USE_TLS:
                    logger.info(f"📧 [EMAIL] Activation de STARTTLS...")
                    server.starttls()
                    logger.info(f"📧 [EMAIL] STARTTLS activé")
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    logger.info(f"📧 [EMAIL] Authentification avec {settings.SMTP_USERNAME}...")
                    # Supprimer les espaces du mot de passe (Gmail génère avec espaces)
                    password_clean = settings.SMTP_PASSWORD.replace(" ", "")
                    server.login(settings.SMTP_USERNAME, password_clean)
                    logger.info(f"📧 [EMAIL] Authentification réussie")
                logger.info(f"📧 [EMAIL] Envoi du message...")
                server.send_message(msg)
                logger.info(f"📧 [EMAIL] Message envoyé avec succès")
            except Exception as send_error:
                logger.error(f"❌ [EMAIL] Erreur lors de l'envoi/authentification: {send_error}")
                logger.error(f"   Type: {type(send_error).__name__}")
                raise
        
        logger.info(f"✅ Email de vérification envoyé avec succès à {email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"❌ Erreur d'authentification SMTP: {e}"
        logger.error(error_msg)
        logger.error("💡 Vérifiez:")
        logger.error("   - Que vous utilisez un 'Mot de passe d'application' Gmail (pas votre mot de passe normal)")
        logger.error("   - Que l'authentification à 2 facteurs est activée sur le compte Gmail")
        logger.error("   - Que le mot de passe dans Railway Variables est correct (sans espaces)")
        logger.error("   - Allez sur https://myaccount.google.com/apppasswords pour générer un nouveau mot de passe")
        return False
    except Exception as e:
        error_msg = f"❌ Erreur lors de l'envoi de l'email de vérification: {e}"
        logger.error(error_msg)
        logger.error(f"   Type d'erreur: {type(e).__name__}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return False


def send_password_reset_email(
    email: str,
    token: str,
    full_name: Optional[str] = None
) -> bool:
    """
    Envoie un email de réinitialisation de mot de passe à l'utilisateur.
    
    Args:
        email: L'adresse email du destinataire
        token: Le token de réinitialisation
        full_name: Le nom complet de l'utilisateur (optionnel)
    
    Returns:
        True si l'email a été envoyé avec succès, False sinon
    """
    # Si pas de configuration SMTP, simuler l'envoi (mode développement)
    if not hasattr(settings, 'SMTP_HOST') or not settings.SMTP_HOST:
        logger.warning("="*80)
        logger.warning("📧 [MOCK EMAIL] Email de réinitialisation de mot de passe")
        logger.warning("="*80)
        logger.warning(f"Destinataire: {email}")
        if full_name:
            logger.warning(f"Nom: {full_name}")
        logger.warning(f"Token de réinitialisation: {token}")
        logger.warning(f"Lien de réinitialisation: {settings.FRONTEND_URL}/reset-password/{token}")
        logger.warning("="*80)
        return True
    
    try:
        # Construire le message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Réinitialisation de votre mot de passe - Lokario"
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = email
        
        # URL de réinitialisation
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
        
        # Corps du message en texte brut
        text_content = f"""
Bonjour {full_name or 'Utilisateur'},

Vous avez demandé à réinitialiser votre mot de passe sur Lokario.

Pour créer un nouveau mot de passe, veuillez cliquer sur le lien suivant :
{reset_url}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe ne sera pas modifié.

Cordialement,
L'équipe Lokario
"""
        
        # Corps du message en HTML
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
        .warning {{ background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
        </div>
        <div class="content">
            <p>Bonjour {full_name or 'Utilisateur'},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe sur Lokario.</p>
            <p>Pour créer un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            <p>Ou copiez-collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #64748B; font-size: 12px;">{reset_url}</p>
            <div class="warning">
                <p><strong>Ce lien est valide pendant 1 heure.</strong></p>
            </div>
            <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe ne sera pas modifié.</p>
        </div>
        <div class="footer">
            <p>Cordialement,<br>L'équipe Lokario</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Attacher les deux versions
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # Envoyer l'email
        # Utiliser SMTP_SSL pour le port 465 (SSL direct) ou SMTP pour le port 587 (TLS)
        if settings.SMTP_PORT == 465:
            # Port 465 : utiliser SSL directement
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    password_clean = settings.SMTP_PASSWORD.replace(" ", "")
                    server.login(settings.SMTP_USERNAME, password_clean)
                server.send_message(msg)
        else:
            # Port 587 ou autres : utiliser STARTTLS
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    password_clean = settings.SMTP_PASSWORD.replace(" ", "")
                    server.login(settings.SMTP_USERNAME, password_clean)
                server.send_message(msg)
        
        logger.info(f"✅ Email de réinitialisation envoyé avec succès à {email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"❌ Erreur d'authentification SMTP lors de l'envoi de réinitialisation: {e}"
        logger.error(error_msg)
        logger.error("💡 Vérifiez la configuration SMTP dans Railway Variables")
        return False
    except Exception as e:
        error_msg = f"❌ Erreur lors de l'envoi de l'email de réinitialisation: {e}"
        logger.error(error_msg)
        logger.error(f"   Type d'erreur: {type(e).__name__}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return False

