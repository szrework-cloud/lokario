"""
Script pour vérifier si un dossier a été créé et si la classification automatique est activée.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import InboxFolder

def check_folders():
    """Vérifie les dossiers créés et leur configuration."""
    db: Session = SessionLocal()
    try:
        folders = db.query(InboxFolder).filter(
            InboxFolder.is_system == False
        ).order_by(InboxFolder.created_at.desc()).limit(10).all()
        
        print("\n" + "="*60)
        print("📁 DERNIERS DOSSIERS CRÉÉS")
        print("="*60)
        
        if not folders:
            print("❌ Aucun dossier trouvé")
            return
        
        for folder in folders:
            print(f"\n📂 Dossier: {folder.name} (ID: {folder.id})")
            print(f"   Type: {folder.folder_type}")
            print(f"   Créé le: {folder.created_at}")
            
            ai_rules = folder.ai_rules or {}
            auto_classify = isinstance(ai_rules, dict) and ai_rules.get("autoClassify", False)
            context = ai_rules.get("context", "Aucun contexte")
            
            print(f"   Classification automatique: {'✅ Activée' if auto_classify else '❌ Désactivée'}")
            if auto_classify:
                print(f"   Contexte: {context}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_folders()

