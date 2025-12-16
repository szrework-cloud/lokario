"""
Script de diagnostic pour tester la classification automatique avec ChatGPT.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.INFO)

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.ai_classifier_service import AIClassifierService
from app.core.folder_ai_classifier import classify_conversation_to_folder, reclassify_all_conversations

def test_ai_service():
    """Teste si le service IA est configuré."""
    print("\n" + "="*60)
    print("🔍 TEST 1: Vérification du service IA")
    print("="*60)
    
    classifier = AIClassifierService()
    
    if classifier.enabled:
        print("✅ Service IA activé")
        print(f"✅ Client OpenAI initialisé: {classifier.client is not None}")
        
        # Test simple
        try:
            test_response = classifier.client.models.list()
            print("✅ Connexion à l'API OpenAI réussie")
            return True
        except Exception as e:
            print(f"❌ Erreur lors de la connexion à OpenAI: {e}")
            return False
    else:
        print("❌ Service IA désactivé")
        print("⚠️  Vérifiez que OPENAI_API_KEY est configurée dans backend/.env")
        return False

def test_folders_with_ai(db: Session, company_id: int):
    """Teste les dossiers avec classification automatique activée."""
    print("\n" + "="*60)
    print("🔍 TEST 2: Vérification des dossiers avec IA")
    print("="*60)
    
    folders = db.query(InboxFolder).filter(
        InboxFolder.company_id == company_id,
        InboxFolder.is_system == False
    ).all()
    
    print(f"📁 Total de dossiers trouvés: {len(folders)}")
    
    folders_with_ai = []
    for folder in folders:
        ai_rules = folder.ai_rules or {}
        auto_classify = isinstance(ai_rules, dict) and ai_rules.get("autoClassify", False)
        
        print(f"\n  📂 Dossier: {folder.name} (ID: {folder.id})")
        print(f"     Type: {folder.folder_type}")
        print(f"     Classification automatique: {'✅ Activée' if auto_classify else '❌ Désactivée'}")
        
        if auto_classify:
            context = ai_rules.get("context", "Pas de contexte défini")
            print(f"     Contexte: {context[:100]}...")
            folders_with_ai.append(folder)
    
    if folders_with_ai:
        print(f"\n✅ {len(folders_with_ai)} dossier(s) avec classification automatique activée")
        return folders_with_ai
    else:
        print("\n⚠️  Aucun dossier avec classification automatique activée")
        print("   Pour activer: Cochez 'Classer automatiquement les messages dans ce dossier'")
        return []

def test_conversations(db: Session, company_id: int):
    """Teste les conversations disponibles."""
    print("\n" + "="*60)
    print("🔍 TEST 3: Vérification des conversations")
    print("="*60)
    
    conversations_without_folder = db.query(Conversation).filter(
        Conversation.company_id == company_id,
        Conversation.folder_id.is_(None)
    ).all()
    
    all_conversations = db.query(Conversation).filter(
        Conversation.company_id == company_id
    ).all()
    
    print(f"📧 Total de conversations: {len(all_conversations)}")
    print(f"📧 Conversations sans dossier: {len(conversations_without_folder)}")
    
    if conversations_without_folder:
        print("\n📋 Exemples de conversations sans dossier:")
        for conv in conversations_without_folder[:5]:
            last_msg = db.query(InboxMessage).filter(
                InboxMessage.conversation_id == conv.id
            ).order_by(InboxMessage.created_at.desc()).first()
            
            content_preview = (last_msg.content[:50] + "...") if last_msg and last_msg.content else "Pas de contenu"
            print(f"  • Conversation {conv.id}: {content_preview}")
        
        return conversations_without_folder
    else:
        print("⚠️  Toutes les conversations ont déjà un dossier assigné")
        return []

def test_classification(db: Session, company_id: int, conversation_id: int = None):
    """Teste la classification d'une conversation."""
    print("\n" + "="*60)
    print("🔍 TEST 4: Test de classification")
    print("="*60)
    
    if not conversation_id:
        # Prendre la première conversation sans dossier
        conversation = db.query(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.folder_id.is_(None)
        ).first()
        
        if not conversation:
            print("⚠️  Aucune conversation sans dossier pour tester")
            return
    else:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.company_id == company_id
        ).first()
        
        if not conversation:
            print(f"❌ Conversation {conversation_id} introuvable")
            return
    
    print(f"📧 Test avec la conversation {conversation.id}")
    print(f"   Sujet: {conversation.subject}")
    
    last_message = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id
    ).order_by(InboxMessage.created_at.desc()).first()
    
    if not last_message:
        print("❌ Aucun message trouvé dans cette conversation")
        return
    
    print(f"   Dernier message: {last_message.content[:100]}...")
    
    print("\n🤖 Tentative de classification...")
    folder_id = classify_conversation_to_folder(
        db=db,
        conversation=conversation,
        message=last_message,
        company_id=company_id
    )
    
    if folder_id:
        folder = db.query(InboxFolder).filter(InboxFolder.id == folder_id).first()
        print(f"✅ Conversation classée dans le dossier: {folder.name if folder else 'Inconnu'} (ID: {folder_id})")
    else:
        print("⚠️  Aucun dossier approprié trouvé par l'IA")

def test_reclassification(db: Session, company_id: int):
    """Teste la reclassification de toutes les conversations."""
    print("\n" + "="*60)
    print("🔍 TEST 5: Test de reclassification globale")
    print("="*60)
    
    print("🔄 Démarrage de la reclassification...")
    stats = reclassify_all_conversations(db=db, company_id=company_id, force=False)
    
    print(f"\n📊 Résultats:")
    print(f"   Total traité: {stats['total']}")
    print(f"   Classées: {stats['classified']} ✅")
    print(f"   Non classées: {stats['not_classified']}")
    print(f"   Erreurs: {stats['errors']}")

def main():
    """Fonction principale."""
    print("\n" + "="*60)
    print("🧪 DIAGNOSTIC: Test de la Classification IA")
    print("="*60)
    
    # Test 1: Service IA
    if not test_ai_service():
        print("\n❌ Le service IA n'est pas configuré. Arrêt des tests.")
        return
    
    # Obtenir une company_id (on prend la première disponible)
    db: Session = SessionLocal()
    try:
        from app.db.models.company import Company
        company = db.query(Company).first()
        
        if not company:
            print("\n❌ Aucune entreprise trouvée dans la base de données")
            return
        
        company_id = company.id
        print(f"\n🏢 Tests pour l'entreprise ID: {company_id}")
        
        # Test 2: Dossiers
        folders_with_ai = test_folders_with_ai(db, company_id)
        
        if not folders_with_ai:
            print("\n⚠️  Aucun dossier avec classification automatique activée")
            print("   Créez un dossier et activez la classification automatique pour continuer")
            return
        
        # Test 3: Conversations
        conversations = test_conversations(db, company_id)
        
        if not conversations:
            print("\n⚠️  Toutes les conversations ont déjà un dossier")
            print("   Pour tester, créez une nouvelle conversation ou enlevez le dossier d'une conversation existante")
        
        # Test 4: Classification d'une conversation
        if conversations:
            test_classification(db, company_id, conversations[0].id)
        
        # Test 5: Reclassification globale
        response = input("\n❓ Voulez-vous tester la reclassification globale de toutes les conversations ? (o/N): ")
        if response.lower() == 'o':
            test_reclassification(db, company_id)
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    print("\n" + "="*60)
    print("✅ Diagnostic terminé")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

