#!/usr/bin/env python3
"""
Script pour tester que le template (message de base) est bien utilisé dans l'auto-réponse.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxFolder, InboxMessage
from app.core.auto_reply_service import generate_auto_reply_content
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def test_template_usage():
    db = SessionLocal()
    try:
        # Trouver une conversation dans un dossier avec auto-réponse
        folder = db.query(InboxFolder).filter(
            InboxFolder.id == 8  # Dossier "rdv"
        ).first()
        
        if not folder:
            print("❌ Dossier non trouvé")
            return
        
        print(f"📁 Dossier: {folder.name}")
        auto_reply = folder.auto_reply or {}
        template = auto_reply.get("template", "")
        print(f"📝 Template configuré: {repr(template)}")
        print()
        
        # Trouver une conversation dans ce dossier (ou utiliser la conversation 95)
        conv = db.query(Conversation).filter(
            Conversation.id == 95
        ).first()
        
        if not conv:
            conv = db.query(Conversation).filter(
                Conversation.folder_id == folder.id
            ).first()
        
        if not conv:
            print("❌ Aucune conversation trouvée dans ce dossier")
            return
        
        print(f"💬 Conversation: {conv.id}")
        print(f"   Messages: {db.query(InboxMessage).filter(InboxMessage.conversation_id == conv.id).count()}")
        print()
        
        # Générer une réponse
        print("🔄 Génération de la réponse avec template...")
        reply = generate_auto_reply_content(db, conv, folder, auto_reply)
        
        if reply:
            print(f"✅ Réponse générée ({len(reply)} caractères):")
            print(f"   {reply}")
            print()
            
            # Vérifier si le template est utilisé
            if template and template.lower() in reply.lower():
                print("✅ Le template semble être utilisé dans la réponse")
            else:
                print("⚠️  Le template ne semble pas être directement visible dans la réponse")
                print("   (C'est normal, l'IA adapte le template selon le contexte)")
        else:
            print("❌ Aucune réponse générée")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_template_usage()

