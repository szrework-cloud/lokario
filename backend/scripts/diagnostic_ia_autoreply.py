#!/usr/bin/env python3
"""
Script de diagnostic pour vérifier le fonctionnement de l'IA et de l'auto-réponse.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.ai_reply_service import ai_reply_service
from app.core.auto_reply_service import process_auto_reply, should_send_auto_reply
from app.core.config import settings

print("=" * 80)
print("DIAGNOSTIC IA ET AUTO-RÉPONSE")
print("=" * 80)
print()

# 1. Vérifier la configuration OpenAI
print("1️⃣  Vérification de la configuration OpenAI")
print("-" * 80)
if not settings.OPENAI_API_KEY:
    print("❌ OPENAI_API_KEY non configuré dans .env")
    sys.exit(1)
else:
    print(f"✅ OPENAI_API_KEY configuré ({len(settings.OPENAI_API_KEY)} caractères)")

if not ai_reply_service.enabled:
    print("❌ Service IA non activé")
    sys.exit(1)
else:
    print("✅ Service IA activé")
print()

# 2. Tester la génération de réponse
print("2️⃣  Test de génération de réponse IA")
print("-" * 80)
test_messages = [
    {"content": "Bonjour, j'aimerais avoir des informations.", "is_from_client": True},
]
try:
    reply = ai_reply_service.generate_reply(
        conversation_messages=test_messages,
        client_name="Test Client",
        custom_prompt="Répondez de manière professionnelle."
    )
    if reply:
        print(f"✅ Réponse générée: {reply[:100]}...")
    else:
        print("❌ Aucune réponse générée")
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
print()

# 3. Vérifier les conversations avec auto-réponse configurée
print("3️⃣  Vérification des conversations avec auto-réponse")
print("-" * 80)
db = SessionLocal()
try:
    conversations = db.query(Conversation).limit(10).all()
    print(f"📊 {len(conversations)} conversation(s) trouvée(s)")
    
    for conv in conversations:
        folder = None
        if conv.folder_id:
            folder = db.query(InboxFolder).filter(InboxFolder.id == conv.folder_id).first()
        
        print(f"\n📧 Conversation {conv.id}:")
        print(f"   Sujet: {conv.subject}")
        print(f"   Dossier: {folder.name if folder else 'Aucun'}")
        print(f"   auto_reply_sent: {conv.auto_reply_sent}")
        print(f"   auto_reply_pending: {conv.auto_reply_pending}")
        print(f"   auto_reply_mode: {conv.auto_reply_mode}")
        print(f"   pending_auto_reply_content: {'✅ Présent' if conv.pending_auto_reply_content else '❌ Absent'}")
        
        if folder:
            auto_reply = folder.auto_reply or {}
            print(f"   Config auto_reply dossier: enabled={auto_reply.get('enabled')}, mode={auto_reply.get('mode')}")
            
            if auto_reply.get('enabled'):
                should_send = should_send_auto_reply(db, conv, folder)
                print(f"   should_send_auto_reply: {should_send}")
                
                if should_send and not conv.auto_reply_sent:
                    print(f"   ⚠️  Auto-réponse devrait être envoyée mais ne l'est pas encore")
        
        # Vérifier les messages
        messages = db.query(InboxMessage).filter(
            InboxMessage.conversation_id == conv.id
        ).order_by(InboxMessage.created_at.desc()).limit(3).all()
        print(f"   Messages: {len(messages)} (derniers 3)")
        for msg in messages:
            print(f"      - {msg.from_name}: {msg.content[:50]}... (is_from_client={msg.is_from_client})")
        
finally:
    db.close()

print()
print("=" * 80)
print("DIAGNOSTIC TERMINÉ")
print("=" * 80)

