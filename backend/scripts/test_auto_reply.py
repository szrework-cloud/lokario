"""
Script pour tester la génération de réponse automatique pour une conversation existante.
"""
import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxFolder
from app.core.auto_reply_service import process_auto_reply

def test_auto_reply(conversation_id: int):
    """Génère une réponse automatique pour une conversation."""
    db = SessionLocal()
    try:
        # Récupérer la conversation
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            print(f"❌ Conversation {conversation_id} introuvable")
            return
        
        print(f"✅ Conversation trouvée: {conversation.subject}")
        print(f"   - Dossier ID: {conversation.folder_id}")
        print(f"   - Auto-reply pending: {conversation.auto_reply_pending}")
        print(f"   - Mode: {conversation.auto_reply_mode}")
        
        # Récupérer le dossier
        folder = None
        if conversation.folder_id:
            folder = db.query(InboxFolder).filter(InboxFolder.id == conversation.folder_id).first()
            if folder:
                print(f"✅ Dossier trouvé: {folder.name}")
                print(f"   - Auto-reply config: {folder.auto_reply}")
            else:
                print(f"⚠️  Dossier ID {conversation.folder_id} introuvable")
        else:
            print("⚠️  Conversation sans dossier")
        
        # Si la réponse a déjà été envoyée, proposer de réinitialiser pour tester
        if conversation.auto_reply_sent:
            print(f"\n⚠️  La réponse automatique a déjà été envoyée pour cette conversation.")
            print(f"   Pour tester, réinitialisation de auto_reply_sent...")
            conversation.auto_reply_sent = False
            conversation.auto_reply_pending = False
            conversation.auto_reply_mode = None
            conversation.pending_auto_reply_content = None
            db.commit()
            print(f"   ✅ Réinitialisé")
        
        # Traiter la réponse automatique
        print("\n🔄 Génération de la réponse automatique...")
        result = process_auto_reply(db=db, conversation=conversation, folder=folder)
        
        print(f"\n📊 Résultat:")
        print(f"   - Envoyé: {result.get('sent', False)}")
        print(f"   - En attente: {result.get('pending', False)}")
        print(f"   - Contenu: {len(result.get('content', '') or '')} caractères")
        
        if result.get('content'):
            print(f"\n📝 Contenu de la réponse:")
            print(f"   {result['content'][:200]}...")
        
        # Recharger la conversation pour voir les changements
        db.refresh(conversation)
        print(f"\n✅ Conversation mise à jour:")
        print(f"   - Auto-reply pending: {conversation.auto_reply_pending}")
        print(f"   - Mode: {conversation.auto_reply_mode}")
        print(f"   - Contenu stocké: {len(conversation.pending_auto_reply_content or '')} caractères")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_auto_reply.py <conversation_id>")
        print("Exemple: python test_auto_reply.py 91")
        sys.exit(1)
    
    conversation_id = int(sys.argv[1])
    test_auto_reply(conversation_id)
