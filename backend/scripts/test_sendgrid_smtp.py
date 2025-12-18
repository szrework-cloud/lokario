#!/usr/bin/env python3
"""
Script de test pour vérifier la configuration SMTP SendGrid.
Teste la connexion et l'envoi d'un email de test.
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configurer le logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_smtp_configuration():
    """Affiche la configuration SMTP actuelle."""
    print("\n" + "="*80)
    print("📧 Configuration SMTP actuelle")
    print("="*80)
    
    print(f"Host: {settings.SMTP_HOST}")
    print(f"Port: {settings.SMTP_PORT}")
    print(f"Use TLS: {settings.SMTP_USE_TLS}")
    print(f"Username: {settings.SMTP_USERNAME}")
    
    if settings.SMTP_PASSWORD:
        print(f"Password: ✅ Configuré ({len(settings.SMTP_PASSWORD)} caractères)")
        # Afficher les 10 premiers caractères pour debug
        print(f"Password (début): {settings.SMTP_PASSWORD[:10]}...")
    else:
        print("Password: ❌ Non configuré")
    
    print(f"From Email: {settings.SMTP_FROM_EMAIL}")
    print("="*80 + "\n")


def test_smtp_connection():
    """Teste la connexion SMTP à SendGrid."""
    print("\n" + "="*80)
    print("🔌 Test de connexion SMTP")
    print("="*80)
    
    if not settings.SMTP_HOST:
        print("❌ SMTP_HOST n'est pas configuré !")
        return False
    
    try:
        print(f"Connexion à {settings.SMTP_HOST}:{settings.SMTP_PORT}...")
        
        if settings.SMTP_PORT == 465:
            # Port 465 : SSL direct
            print("Mode: SSL direct (port 465)")
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            # Port 587 : STARTTLS
            print("Mode: STARTTLS (port 587)")
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            if settings.SMTP_USE_TLS:
                print("Activation de STARTTLS...")
                server.starttls()
                print("✅ STARTTLS activé")
        
        print("✅ Connexion SMTP établie")
        
        # Test d'authentification
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            print(f"Authentification avec username: {settings.SMTP_USERNAME}...")
            password_clean = settings.SMTP_PASSWORD.replace(" ", "")
            server.login(settings.SMTP_USERNAME, password_clean)
            print("✅ Authentification réussie")
        else:
            print("⚠️  Pas de credentials configurés pour l'authentification")
        
        server.quit()
        print("✅ Déconnexion réussie")
        print("="*80 + "\n")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Erreur d'authentification SMTP: {e}")
        print("\n💡 Vérifiez:")
        print("   - Que SMTP_USERNAME = 'apikey' (en minuscules)")
        print("   - Que SMTP_PASSWORD contient votre API Key SendGrid complète")
        print("   - Que l'API Key est valide dans SendGrid Dashboard")
        print("="*80 + "\n")
        return False
        
    except smtplib.SMTPException as e:
        print(f"❌ Erreur SMTP: {e}")
        print("="*80 + "\n")
        return False
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        print(f"   Traceback:\n{traceback.format_exc()}")
        print("="*80 + "\n")
        return False


def test_send_email():
    """Teste l'envoi d'un email de test."""
    print("\n" + "="*80)
    print("📤 Test d'envoi d'email")
    print("="*80)
    
    if not settings.SMTP_HOST:
        print("❌ SMTP_HOST n'est pas configuré !")
        return False
    
    # Demander l'adresse email de destination
    test_email = input("Entrez l'adresse email de test (ou appuyez sur Entrée pour utiliser noreply@lokario.fr): ").strip()
    if not test_email:
        test_email = "noreply@lokario.fr"
        print(f"Utilisation de l'adresse par défaut: {test_email}")
    
    try:
        # Créer le message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Test Email - Lokario SMTP Configuration"
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = test_email
        
        # Corps du message
        text_content = """
Bonjour,

Ceci est un email de test pour vérifier la configuration SMTP SendGrid.

Si vous recevez cet email, la configuration SMTP fonctionne correctement !

Cordialement,
Lokario
"""
        
        html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email - Lokario</h1>
        </div>
        <div class="content">
            <p>Bonjour,</p>
            <p>Ceci est un <strong>email de test</strong> pour vérifier la configuration SMTP SendGrid.</p>
            <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement ! ✅</p>
            <p>Cordialement,<br>Lokario</p>
        </div>
    </div>
</body>
</html>
"""
        
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        print(f"\nEnvoi de l'email à {test_email}...")
        
        # Connexion et envoi
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            if settings.SMTP_USE_TLS:
                server.starttls()
        
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            password_clean = settings.SMTP_PASSWORD.replace(" ", "")
            server.login(settings.SMTP_USERNAME, password_clean)
        
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email envoyé avec succès à {test_email} !")
        print("="*80 + "\n")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Erreur d'authentification: {e}")
        print("\n💡 Vérifiez votre API Key SendGrid dans Railway Variables")
        print("="*80 + "\n")
        return False
        
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        print(f"   Traceback:\n{traceback.format_exc()}")
        print("="*80 + "\n")
        return False


def main():
    """Fonction principale."""
    print("\n" + "="*80)
    print("🧪 Test de configuration SMTP SendGrid")
    print("="*80)
    
    # Afficher la configuration
    test_smtp_configuration()
    
    # Test de connexion
    connection_ok = test_smtp_connection()
    
    if not connection_ok:
        print("❌ La connexion SMTP a échoué. Vérifiez votre configuration.")
        return
    
    # Test d'envoi
    print("Voulez-vous tester l'envoi d'un email ? (o/n)")
    response = input().strip().lower()
    
    if response in ['o', 'oui', 'y', 'yes']:
        send_ok = test_send_email()
        if send_ok:
            print("\n🎉 Tous les tests sont passés avec succès !")
        else:
            print("\n❌ L'envoi d'email a échoué. Vérifiez votre configuration.")
    else:
        print("\n✅ Connexion SMTP testée avec succès !")
        print("   Vous pouvez maintenant tester l'envoi d'email depuis l'application.")


if __name__ == "__main__":
    main()
