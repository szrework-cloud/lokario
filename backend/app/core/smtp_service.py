"""
Service SMTP pour envoyer des emails via la boîte mail configurée.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict
from pathlib import Path
import re
from app.core.config import settings

logger = logging.getLogger(__name__)

# Import SendGrid (optionnel, seulement si disponible)
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, Content, Attachment
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logger.warning("SendGrid SDK non disponible. Utilisation de SMTP uniquement.")


def get_smtp_config(email_address: str) -> Dict[str, any]:
    """
    Détermine la configuration SMTP à partir de l'adresse email.
    
    Returns:
        dict avec smtp_server, smtp_port, use_tls
    """
    email_lower = email_address.lower()
    
    # Gmail
    if "gmail.com" in email_lower:
        return {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # OVH
    if any(domain in email_lower for domain in ["ovh.com", "ovh.net", "1and1.com", "1and1.fr"]):
        return {
            "smtp_server": "ssl0.ovh.net",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # Outlook/Hotmail
    if any(domain in email_lower for domain in ["outlook.com", "hotmail.com", "live.com", "msn.com"]):
        return {
            "smtp_server": "smtp-mail.outlook.com",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # Yahoo
    if any(domain in email_lower for domain in ["yahoo.com", "yahoo.fr", "ymail.com"]):
        return {
            "smtp_server": "smtp.mail.yahoo.com",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # Orange
    if "orange.fr" in email_lower:
        return {
            "smtp_server": "smtp.orange.fr",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # Free
    if "free.fr" in email_lower:
        return {
            "smtp_server": "smtp.free.fr",
            "smtp_port": 587,
            "use_tls": True,
        }
    
    # Par défaut, essayer un serveur SMTP générique
    # L'utilisateur devra peut-être configurer manuellement
    return {
        "smtp_server": "smtp." + email_lower.split("@")[1] if "@" in email_lower else "smtp.example.com",
        "smtp_port": 587,
        "use_tls": True,
    }


def send_email_smtp(
    smtp_server: str,
    smtp_port: int,
    email_address: str,
    password: str,
    to_email: str,
    subject: str,
    content: str,
    use_tls: bool = True,
    attachments: Optional[List[Dict[str, any]]] = None,
    from_name: Optional[str] = None,
    reply_to: Optional[str] = None
) -> bool:
    """
    Envoie un email via SMTP (avec fallback vers SendGrid API si configuré).
    
    Args:
        smtp_server: Serveur SMTP (ex: smtp.gmail.com)
        smtp_port: Port SMTP (ex: 587)
        email_address: Adresse email de l'expéditeur
        password: Mot de passe ou app password
        to_email: Adresse email du destinataire
        subject: Sujet de l'email
        content: Contenu de l'email (texte)
        use_tls: Utiliser TLS (True) ou SSL (False)
        attachments: Liste de pièces jointes [{"path": "...", "filename": "..."}]
        from_name: Nom de l'expéditeur (optionnel)
        reply_to: Email de réponse (optionnel)
    
    Returns:
        True si l'email a été envoyé avec succès, False sinon
    """
    # Priorité 1 : Utiliser SendGrid API REST si configuré (évite les problèmes réseau sur Railway)
    if hasattr(settings, 'SENDGRID_API_KEY') and settings.SENDGRID_API_KEY and SENDGRID_AVAILABLE:
        logger.info(f"📧 [SMTP SERVICE] Utilisation de l'API REST SendGrid (fallback)")
        try:
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            
            # Construire le message SendGrid
            message = Mail(
                from_email=Email(email_address, from_name or email_address),
                to_emails=to_email,
                subject=subject,
                plain_text_content=Content("text/plain", content)
            )
            
            # Ajouter Reply-To si fourni
            if reply_to:
                message.reply_to = Email(reply_to)
            
            # Ajouter les pièces jointes si fournies
            if attachments:
                for att in attachments:
                    file_path = att.get("path")
                    filename = att.get("filename", Path(file_path).name if file_path else "attachment")
                    
                    if file_path and Path(file_path).exists():
                        with open(file_path, "rb") as f:
                            file_data = f.read()
                        
                        attachment = Attachment()
                        attachment.file_content = file_data
                        attachment.file_name = filename
                        attachment.disposition = "attachment"
                        message.add_attachment(attachment)
            
            logger.info(f"📧 [SENDGRID API] Envoi du message depuis {email_address} à {to_email}...")
            response = sg.send(message)
            
            if response.status_code == 202:
                logger.info(f"✅ [SENDGRID API] Email envoyé avec succès (status: {response.status_code})")
                return True
            else:
                logger.error(f"❌ [SENDGRID API] Erreur (status: {response.status_code}): {response.body}")
                # Tomber sur SMTP si SendGrid échoue
                logger.info(f"📧 [SENDGRID API] Passage au fallback SMTP...")
        except Exception as e:
            logger.error(f"❌ [SENDGRID API] Erreur: {e}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")
            # Tomber sur SMTP si SendGrid échoue
            logger.info(f"📧 [SENDGRID API] Passage au fallback SMTP...")
    
    # Priorité 2 : Utiliser SMTP (méthode originale)
    try:
        # Nettoyer le mot de passe (supprimer les espaces pour Gmail)
        cleaned_password = password.replace(" ", "").strip()
        
        # Créer le message
        msg = MIMEMultipart()
        msg['From'] = f"{from_name} <{email_address}>" if from_name else email_address
        msg['To'] = to_email
        msg['Subject'] = subject
        if reply_to:
            msg['Reply-To'] = reply_to
        
        # Ajouter le contenu texte
        msg.attach(MIMEText(content, 'plain', 'utf-8'))
        
        # Ajouter les pièces jointes si fournies
        if attachments:
            for att in attachments:
                file_path = att.get("path")
                filename = att.get("filename", Path(file_path).name if file_path else "attachment")
                
                if file_path and Path(file_path).exists():
                    with open(file_path, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {filename}'
                    )
                    msg.attach(part)
        
        # Connexion au serveur SMTP et envoi
        logger.info(f"[SMTP] Connexion à {smtp_server}:{smtp_port} (TLS: {use_tls})")
        
        # Ajouter un timeout pour éviter les blocages
        timeout = 30
        
        if use_tls:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=timeout)
            server.starttls()  # Activer TLS
        else:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=timeout)  # SSL direct
        
        logger.info(f"[SMTP] Authentification pour {email_address}")
        server.login(email_address, cleaned_password)
        
        logger.info(f"[SMTP] Envoi de l'email à {to_email}")
        text = msg.as_string()
        server.sendmail(email_address, to_email, text)
        server.quit()
        
        logger.info(f"[SMTP] Email envoyé avec succès à {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"Erreur d'authentification SMTP: {str(e)}"
        logger.error(f"[SMTP] {error_msg}")
        
        # Messages d'erreur spécifiques pour Gmail
        if "gmail.com" in email_address.lower():
            error_msg += "\n\nPour Gmail, assurez-vous d'utiliser un mot de passe d'application:\n"
            error_msg += "1. Allez dans votre compte Google > Sécurité\n"
            error_msg += "2. Activez la validation en 2 étapes\n"
            error_msg += "3. Générez un mot de passe d'application\n"
            error_msg += "4. Utilisez ce mot de passe d'application ici"
        
        raise Exception(error_msg)
        
    except Exception as e:
        error_msg = f"Erreur lors de l'envoi de l'email: {str(e)}"
        logger.error(f"[SMTP] {error_msg}")
        import traceback
        traceback.print_exc()
        raise Exception(error_msg)

