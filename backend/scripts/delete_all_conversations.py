#!/usr/bin/env python3
"""
Script pour supprimer toutes les conversations de l'inbox.
⚠️ ATTENTION : Cette action est irréversible !
"""

import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InternalNote
from app.db.models.user import User

def delete_all_conversations(company_id: int = None):
    """
    Supprime toutes les conversations.
    Si company_id est fourni, supprime uniquement celles de cette entreprise.
    Sinon, supprime TOUTES les conversations de toutes les entreprises.
    """
    db: Session = SessionLocal()
    
    try:
        # Construire la requête
        query = db.query(Conversation)
        
        if company_id:
            query = query.filter(Conversation.company_id == company_id)
            print(f"🗑️  Suppression de toutes les conversations pour l'entreprise {company_id}...")
        else:
            print("⚠️  ATTENTION : Suppression de TOUTES les conversations de TOUTES les entreprises !")
            response = input("Êtes-vous sûr ? Tapez 'OUI' en majuscules pour confirmer: ")
            if response != "OUI":
                print("❌ Suppression annulée.")
                return
        
        conversations = query.all()
        count = len(conversations)
        
        if count == 0:
            print("ℹ️  Aucune conversation à supprimer.")
            return
        
        print(f"📧 {count} conversation(s) trouvée(s).")
        
        # Supprimer toutes les conversations
        for conversation in conversations:
            db.delete(conversation)
        
        db.commit()
        
        print(f"✅ {count} conversation(s) supprimée(s) avec succès !")
        print("   (Les messages et notes associés ont également été supprimés automatiquement)")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la suppression : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Supprimer toutes les conversations de l'inbox")
    parser.add_argument(
        "--company-id",
        type=int,
        help="ID de l'entreprise (optionnel, supprime toutes les conversations de cette entreprise seulement)"
    )
    
    args = parser.parse_args()
    
    delete_all_conversations(company_id=args.company_id)

