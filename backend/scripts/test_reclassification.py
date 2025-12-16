"""
Script pour tester la reclassification de toutes les conversations.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.db.models.company import Company
from app.core.folder_ai_classifier import reclassify_all_conversations, classify_conversation_to_folder

def test_reclassification():
    """Teste la reclassification de toutes les conversations."""
    print("\n" + "="*60)
    print("🧪 TEST DE RECLASSIFICATION")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        # Récupérer la première entreprise
        company = db.query(Company).first()
        if not company:
            print("❌ Aucune entreprise trouvée")
            return
        
        company_id = company.id
        print(f"\n🏢 Entreprise ID: {company_id}")
        
        # Vérifier les dossiers avec classification automatique
        folders_with_ai = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id,
            InboxFolder.is_system == False
        ).all()
        
        print(f"\n📁 Dossiers trouvés: {len(folders_with_ai)}")
        
        auto_classify_folders = []
        for folder in folders_with_ai:
            ai_rules = folder.ai_rules or {}
            auto_classify = isinstance(ai_rules, dict) and ai_rules.get("autoClassify", False)
            
            if auto_classify:
                auto_classify_folders.append(folder)
                print(f"  ✅ {folder.name} (ID: {folder.id}) - Classification activée")
            else:
                print(f"  ❌ {folder.name} (ID: {folder.id}) - Classification désactivée")
        
        if not auto_classify_folders:
            print("\n⚠️  Aucun dossier avec classification automatique activée")
            return
        
        # Vérifier les conversations sans dossier
        conversations_without_folder = db.query(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.folder_id.is_(None)
        ).count()
        
        print(f"\n📧 Conversations sans dossier: {conversations_without_folder}")
        
        if conversations_without_folder == 0:
            print("⚠️  Toutes les conversations ont déjà un dossier")
            return
        
        # Tester la reclassification
        print(f"\n🔄 Démarrage de la reclassification...")
        print("-" * 60)
        
        stats = reclassify_all_conversations(db=db, company_id=company_id, force=False)
        
        print("\n" + "="*60)
        print("📊 RÉSULTATS")
        print("="*60)
        print(f"Total traité: {stats['total']}")
        print(f"✅ Classées: {stats['classified']}")
        print(f"⚠️  Non classées: {stats['not_classified']}")
        print(f"❌ Erreurs: {stats['errors']}")
        
        if stats['classified'] > 0:
            print(f"\n✅ SUCCESS! {stats['classified']} conversation(s) classée(s) automatiquement!")
        elif stats['total'] == 0:
            print("\n⚠️  Aucune conversation à traiter (toutes ont déjà un dossier)")
        else:
            print("\n⚠️  Aucune conversation n'a été classée. Vérifiez les logs pour comprendre pourquoi.")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    print("\n" + "="*60)

if __name__ == "__main__":
    test_reclassification()

