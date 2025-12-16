"""
Script pour compter combien d'appels à l'IA seraient faits.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder

def count_ai_calls():
    """Compte combien d'appels à l'IA seraient nécessaires."""
    db: Session = SessionLocal()
    try:
        print("\n" + "="*60)
        print("📊 COMPTAGE DES APPELS IA")
        print("="*60)
        
        # Compter les conversations
        conversations = db.query(Conversation).all()
        
        print(f"\n📧 Conversations totales: {len(conversations)}")
        
        # Compter les conversations par entreprise
        from collections import defaultdict
        by_company = defaultdict(int)
        by_company_with_folder = defaultdict(int)
        by_company_without_folder = defaultdict(int)
        
        for conv in conversations:
            by_company[conv.company_id] += 1
            if conv.folder_id:
                by_company_with_folder[conv.company_id] += 1
            else:
                by_company_without_folder[conv.company_id] += 1
        
        print(f"\n📊 Par entreprise:")
        for company_id, count in by_company.items():
            print(f"   Company {company_id}: {count} conversations")
            print(f"      - Avec dossier: {by_company_with_folder[company_id]}")
            print(f"      - Sans dossier: {by_company_without_folder[company_id]}")
        
        # Compter les dossiers avec autoClassify
        folders_with_ai = db.query(InboxFolder).filter(InboxFolder.is_system == False).all()
        
        ai_folders_by_company = defaultdict(list)
        for folder in folders_with_ai:
            ai_rules = folder.ai_rules or {}
            if isinstance(ai_rules, dict) and ai_rules.get("autoClassify", False):
                ai_folders_by_company[folder.company_id].append(folder)
        
        print(f"\n🤖 Dossiers avec classification IA activée:")
        total_ai_calls = 0
        
        for company_id, folders in ai_folders_by_company.items():
            conversations_count = by_company[company_id]
            print(f"\n   Company {company_id}: {len(folders)} dossier(s) avec IA")
            print(f"      Conversations à classifier: {conversations_count}")
            print(f"      → {conversations_count} appel(s) IA nécessaire(s) pour reclasser TOUT")
            total_ai_calls += conversations_count
            
            for folder in folders:
                context = folder.ai_rules.get("context", "") if folder.ai_rules else ""
                print(f"         - {folder.name}: '{context}'")
        
        print(f"\n" + "="*60)
        print(f"⚠️  TOTAL: {total_ai_calls} appel(s) IA seraient nécessaires pour reclasser toutes les conversations")
        print(f"="*60)
        
        if total_ai_calls > 100:
            print(f"\n⚠️  ATTENTION: {total_ai_calls} appels IA = coût élevé !")
            print(f"   Suggestion: Limiter la reclassification aux conversations sans dossier ou récemment modifiées")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    count_ai_calls()

