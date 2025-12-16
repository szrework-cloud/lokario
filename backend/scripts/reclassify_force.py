"""
Script pour forcer la reclassification de toutes les conversations,
y compris celles déjà dans un dossier.
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

def force_reclassify():
    """Force la reclassification de toutes les conversations."""
    print("\n" + "="*60)
    print("🔄 RECLASSIFICATION FORCÉE")
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
            
            print(f"  - {folder.name} (ID: {folder.id}) - Company ID: {folder.company_id} - autoClassify: {auto}")
            
            if auto:
                folders_with_ai.append(folder)
        
        if not folders_with_ai:
            print("\n⚠️  Aucun dossier avec classification automatique activée")
            return
        
        # Regrouper par company_id
        from collections import defaultdict
        companies_folders = defaultdict(list)
        for folder in folders_with_ai:
            companies_folders[folder.company_id].append(folder)
        
        # Tester la reclassification pour chaque entreprise (avec force=True)
        for company_id, company_folders in companies_folders.items():
            print(f"\n" + "-"*60)
            print(f"🔄 Reclassification FORCÉE pour Company ID: {company_id}")
            print(f"   Dossiers avec IA: {[f.name for f in company_folders]}")
            print(f"   (y compris les conversations déjà dans un dossier)")
            
            stats = reclassify_all_conversations(db=db, company_id=company_id, force=True)
            
            print(f"\n📊 Résultats:")
            print(f"   Total traitées: {stats['total']}")
            print(f"   ✅ Reclassées: {stats['classified']}")
            print(f"   ⚠️  Non reclassées: {stats['not_classified']}")
            print(f"   ❌ Erreurs: {stats['errors']}")
            
            if stats['classified'] > 0:
                print(f"\n   🎉 SUCCESS! {stats['classified']} conversation(s) reclassée(s) !")
        
        print("\n" + "="*60)
        print("✅ Reclassification terminée !")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    force_reclassify()
