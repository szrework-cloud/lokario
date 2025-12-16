"""
Script pour tester la classification basée sur l'expéditeur.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.folder_ai_classifier import reclassify_all_conversations

def test_classification_expediteur():
    """Teste la classification basée sur l'expéditeur."""
    print("\n" + "="*60)
    print("🧪 TEST CLASSIFICATION PAR EXPÉDITEUR")
    print("="*60)
    
    db: Session = SessionLocal()
    try:
        # Trouver tous les dossiers avec autoClassify
        folders = db.query(InboxFolder).filter(InboxFolder.is_system == False).all()
        
        print(f"\n📁 Dossiers trouvés: {len(folders)}")
        
        for folder in folders:
            ai_rules = folder.ai_rules or {}
            auto = ai_rules.get("autoClassify", False) if isinstance(ai_rules, dict) else False
            context = ai_rules.get("context", "") if isinstance(ai_rules, dict) else ""
            
            print(f"\n📂 {folder.name} (ID: {folder.id})")
            print(f"   autoClassify: {auto}")
            print(f"   context: {context}")
            
            if auto and context:
                # Vérifier les conversations avec expéditeurs correspondants
                conversations = db.query(Conversation).filter(
                    Conversation.company_id == folder.company_id
                ).all()
                
                matching_conversations = []
                for conv in conversations:
                    last_message = db.query(InboxMessage).filter(
                        InboxMessage.conversation_id == conv.id
                    ).order_by(InboxMessage.created_at.desc()).first()
                    
                    if last_message:
                        from_email = (last_message.from_email or "").lower()
                        from_phone = (last_message.from_phone or "").lower()
                        message_from = from_email or from_phone
                        
                        if message_from and any(keyword in message_from for keyword in context.lower().split() if len(keyword) >= 3):
                            matching_conversations.append({
                                "conversation_id": conv.id,
                                "from": message_from,
                                "folder_id": conv.folder_id,
                                "subject": conv.subject
                            })
                
                if matching_conversations:
                    print(f"\n   ✅ {len(matching_conversations)} conversation(s) trouvée(s) avec expéditeurs correspondants:")
                    for match in matching_conversations[:5]:  # Afficher les 5 premières
                        print(f"      - Conv {match['conversation_id']}: {match['from']} (dans dossier: {match['folder_id']})")
        
        print("\n" + "-"*60)
        print("🔄 Reclassification FORCÉE de toutes les conversations...")
        
        # Trouver les company_ids uniques
        company_ids = set(f.company_id for f in folders if (f.ai_rules or {}).get("autoClassify", False))
        
        for company_id in company_ids:
            print(f"\n   Company ID: {company_id}")
            stats = reclassify_all_conversations(db=db, company_id=company_id, force=True)
            print(f"   ✅ {stats['classified']} classée(s), {stats['total']} totale(s)")
        
        print("\n" + "="*60)
        print("✅ Test terminé !")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_classification_expediteur()

