"""
Script pour reclasser manuellement une conversation dans un dossier avec l'IA.
Utile pour diagnostiquer et tester la classification automatique.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage
from app.core.folder_ai_classifier import classify_conversation_to_folder

def reclassify_conversation(conversation_id: int):
    """Reclasse une conversation dans un dossier avec l'IA."""
    db: Session = SessionLocal()
    try:
        # Récupérer la conversation
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            print(f"❌ Conversation {conversation_id} introuvable")
            return
        
        # Récupérer le dernier message
        last_message = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conversation_id
        ).order_by(InboxMessage.created_at.desc()).first()
        
        if not last_message:
            print(f"❌ Aucun message trouvé pour la conversation {conversation_id}")
            return
        
        print(f"\n📧 Conversation ID: {conversation_id}")
        print(f"   Sujet: {conversation.subject}")
        print(f"   Client: {conversation.client.name if conversation.client else 'N/A'}")
        print(f"   Dossier actuel: {conversation.folder_id}")
        print(f"\n💬 Dernier message:")
        print(f"   Contenu: {last_message.content[:100]}...")
        print(f"   De: {last_message.from_email or last_message.from_phone}")
        
        # Tenter la classification
        print(f"\n🤖 Classification en cours...")
        folder_id = classify_conversation_to_folder(
            db=db,
            conversation=conversation,
            message=last_message,
            company_id=conversation.company_id
        )
        
        if folder_id:
            conversation.folder_id = folder_id
            db.commit()
            print(f"✅ Conversation classée dans le dossier ID: {folder_id}")
        else:
            print(f"⚠️  Aucun dossier approprié trouvé par l'IA")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python reclassify_conversation.py <conversation_id>")
        sys.exit(1)
    
    conversation_id = int(sys.argv[1])
    reclassify_conversation(conversation_id)

