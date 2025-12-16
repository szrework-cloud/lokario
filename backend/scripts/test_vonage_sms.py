"""
Script pour tester l'envoi d'un SMS via Vonage.
"""
import sys
import os

# Ajouter le répertoire parent au PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.inbox_integration import InboxIntegration
from app.core.vonage_service import VonageSMSService

def test_vonage_sms():
    """Teste l'envoi d'un SMS via Vonage."""
    db = SessionLocal()
    
    try:
        # Récupérer l'intégration SMS
        integration = db.query(InboxIntegration).filter(
            InboxIntegration.integration_type == "sms",
            InboxIntegration.is_active == True
        ).first()
        
        if not integration:
            print("❌ Aucune intégration SMS active trouvée")
            return
        
        print(f"📱 Intégration SMS trouvée:")
        print(f"   Nom: {integration.name}")
        print(f"   Numéro: {integration.phone_number}")
        print(f"   API Key: {'***' + integration.api_key[-4:] if integration.api_key and len(integration.api_key) > 4 else 'Non configurée'}")
        print(f"   API Secret: {'***' + integration.webhook_secret[-4:] if integration.webhook_secret and len(integration.webhook_secret) > 4 else 'Non configurée'}")
        print()
        
        # Vérifier que les credentials sont présents
        if not integration.api_key:
            print("❌ API Key manquante")
            return
        
        if not integration.webhook_secret:
            print("❌ API Secret manquante")
            return
        
        if not integration.phone_number:
            print("❌ Numéro de téléphone manquant")
            return
        
        # Initialiser le service Vonage
        print("🔧 Initialisation du service Vonage...")
        vonage_service = VonageSMSService(
            api_key=integration.api_key,
            api_secret=integration.webhook_secret
        )
        
        # Demander le numéro de test
        print()
        test_number = input("📞 Entrez le numéro de téléphone pour tester (format: +33612345678 ou 0612345678): ").strip()
        
        if not test_number:
            print("❌ Numéro de téléphone requis")
            return
        
        # Envoyer un SMS de test
        print()
        print(f"📤 Envoi d'un SMS de test depuis {integration.phone_number} vers {test_number}...")
        
        result = vonage_service.send_sms(
            to=test_number,
            message="🧪 SMS de test depuis votre application B2B SAAS via Vonage. Si vous recevez ce message, tout fonctionne correctement !",
            from_number=integration.phone_number
        )
        
        print()
        if result.get("success"):
            print("✅ SMS envoyé avec succès !")
            print(f"   Message ID: {result.get('message_id')}")
            print(f"   À: {result.get('to')}")
            print(f"   Depuis: {result.get('from')}")
            if result.get("remaining_balance"):
                print(f"   Solde restant: {result.get('remaining_balance')}")
        else:
            print("❌ Erreur lors de l'envoi du SMS:")
            print(f"   Erreur: {result.get('error')}")
            if result.get("error_code"):
                print(f"   Code d'erreur: {result.get('error_code')}")
            if result.get("error_detail"):
                print(f"   Détails: {result.get('error_detail')}")
    
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_vonage_sms()

