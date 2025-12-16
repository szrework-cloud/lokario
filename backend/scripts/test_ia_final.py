"""
Script pour tester que l'IA fonctionne maintenant.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import InboxFolder
from app.core.folder_ai_classifier import reclassify_all_conversations

def test_ia_final():
    """Teste que l'IA fonctionne maintenant."""
    print("\n" + "="*60)
    print("🧪 TEST FINAL DE L'IA")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        # Trouver tous les dossiers avec autoClassify
        folders = db.query(InboxFolder).filter(InboxFolder.is_system == False).all()
        
        print(f"\n📁 Dossiers trouvés: {len(folders)}")
        
        folders_with_ai = []
        for folder in folders:
            ai_rules = folder.ai_rules or {}
            auto = ai_rules.get("autoClassify", False) if isinstance(ai_rules, dict) else False
            
            if auto:
                folders_with_ai.append(folder)
                print(f"  ✅ {folder.name} (ID: {folder.id}) - Company ID: {folder.company_id}")
        
        if not folders_with_ai:
            print("\n⚠️  Aucun dossier avec classification automatique activée")
            return
        
        # Tester la reclassification pour chaque dossier
        for folder in folders_with_ai:
            print(f"\n" + "-"*60)
            print(f"🔄 Test de reclassification pour '{folder.name}' (Company ID: {folder.company_id})...")
            
            stats = reclassify_all_conversations(db=db, company_id=folder.company_id, force=False)
            
            print(f"\n📊 Résultats:")
            print(f"   Total: {stats['total']}")
            print(f"   ✅ Classées: {stats['classified']}")
            print(f"   ⚠️  Non classées: {stats['not_classified']}")
            print(f"   ❌ Erreurs: {stats['errors']}")
            
            if stats['classified'] > 0:
                print(f"\n   🎉 SUCCESS! {stats['classified']} conversation(s) classée(s) !")
            elif stats['errors'] > 0:
                print(f"\n   ⚠️  {stats['errors']} erreur(s) détectée(s)")
        
        print("\n" + "="*60)
        print("✅ Test terminé !")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_ia_final()

