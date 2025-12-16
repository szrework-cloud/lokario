"""
Script simple pour forcer la reclassification de toutes les conversations.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.company import Company
from app.core.folder_ai_classifier import reclassify_all_conversations

def force_reclassify_all():
    """Force la reclassification de toutes les conversations pour toutes les entreprises."""
    db: Session = SessionLocal()
    try:
        companies = db.query(Company).all()
        
        print("\n" + "="*60)
        print("🔄 RECLASSIFICATION FORCÉE DE TOUTES LES CONVERSATIONS")
        print("="*60)
        
        for company in companies:
            print(f"\n🏢 Entreprise ID: {company.id}")
            stats = reclassify_all_conversations(db=db, company_id=company.id, force=True)
            print(f"   ✅ {stats['classified']} reclassée(s), {stats['total']} totale(s)")
        
        print("\n" + "="*60)
        print("✅ Reclassification terminée !")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    force_reclassify_all()

