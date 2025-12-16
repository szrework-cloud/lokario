"""
Script pour tester la configuration SMTP.

Usage:
    python scripts/test_smtp.py <email-destinataire>
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.email import send_verification_email
from app.core.config import settings


def test_smtp(email: str):
    """Teste l'envoi d'un email de vérification."""
    print("="*80)
    print("🧪 Test de configuration SMTP")
    print("="*80)
    print(f"\nConfiguration actuelle:")
    print(f"  SMTP_HOST: {settings.SMTP_HOST or '❌ Non configuré'}")
    print(f"  SMTP_PORT: {settings.SMTP_PORT}")
    print(f"  SMTP_USE_TLS: {settings.SMTP_USE_TLS}")
    print(f"  SMTP_USERNAME: {settings.SMTP_USERNAME or '❌ Non configuré'}")
    print(f"  SMTP_FROM_EMAIL: {settings.SMTP_FROM_EMAIL}")
    print(f"  FRONTEND_URL: {settings.FRONTEND_URL}")
    
    if not settings.SMTP_HOST:
        print("\n⚠️  SMTP_HOST n'est pas configuré !")
        print("   Le système fonctionnera en mode MOCK (pas d'email réel).")
        print("\n   Pour activer l'envoi d'emails réels:")
        print("   1. Créez un fichier .env dans le dossier backend/")
        print("   2. Ajoutez les variables SMTP (voir SMTP_SETUP_GUIDE.md)")
        print("   3. Redémarrez le backend")
        return False
    
    print(f"\n📧 Envoi d'un email de test à: {email}")
    print("   (Utilisez un token de test)")
    
    try:
        result = send_verification_email(
            email=email,
            token="TEST_TOKEN_123456789",
            full_name="Test User"
        )
        
        if result:
            print("\n✅ Email envoyé avec succès !")
            print(f"   Vérifiez la boîte de réception de {email}")
            return True
        else:
            print("\n❌ Échec de l'envoi de l'email")
            return False
    except Exception as e:
        print(f"\n❌ Erreur lors de l'envoi: {e}")
        print("\n💡 Vérifiez:")
        print("   - Que SMTP_HOST, SMTP_USERNAME et SMTP_PASSWORD sont corrects")
        print("   - Que votre connexion internet fonctionne")
        print("   - Que le firewall n'bloque pas le port 587")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_smtp.py <email-destinataire>")
        print("\nExemple:")
        print("  python scripts/test_smtp.py votre-email@gmail.com")
        sys.exit(1)
    
    email = sys.argv[1]
    success = test_smtp(email)
    sys.exit(0 if success else 1)

