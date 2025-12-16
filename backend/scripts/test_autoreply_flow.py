#!/usr/bin/env python3
"""
Script pour tester le flux complet d'auto-réponse.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder
from app.core.auto_reply_service import process_auto_reply
from app.db.models.client import Client
from app.db.models.company import Company

print("=" * 80)
print("TEST FLUX AUTO-RÉPONSE")
print("=" * 80)
print()

db = SessionLocal()
try:
    # Trouver une entreprise
    company = db.query(Company).first()
    if not company:
        print("❌ Aucune entreprise trouvée")
        sys.exit(1)
    
    print(f"✅ Entreprise trouvée: {company.name} (ID: {company.id})")
    
    # Trouver un dossier avec auto-réponse activée
    folders = db.query(InboxFolder).filter(
        InboxFolder.company_id == company.id
    ).all()
    
    folder = None
    for f in folders:
        if f.auto_reply and f.auto_reply.get("enabled"):
            folder = f
            break
    
    if not folder:
        print("❌ Aucun dossier avec auto-réponse trouvé")
        sys.exit(1)
    
    auto_reply = folder.auto_reply or {}
    print(f"✅ Dossier trouvé: {folder.name} (ID: {folder.id})")
    print(f"   Auto-réply: enabled={auto_reply.get('enabled')}, mode={auto_reply.get('mode')}")
    print()
    
    # Trouver ou créer un client de test
    client = db.query(Client).filter(
        Client.company_id == company.id
    ).first()
    
    if not client:
        client = Client(
            company_id=company.id,
            name="Test Client",
            email="test@example.com",
            type="Client"
        )
        db.add(client)
        db.flush()
        print(f"✅ Client de test créé: {client.name}")
    else:
        print(f"✅ Client trouvé: {client.name}")
    print()
    
    # Créer une conversation de test dans ce dossier
    conversation = Conversation(
        company_id=company.id,
        client_id=client.id,
        subject="Test auto-réponse",
        status="À répondre",
        source="email",
        folder_id=folder.id,
        unread_count=1,
        last_message_at=os.popen('date -u +"%Y-%m-%dT%H:%M:%S"').read().strip() if os.name != 'nt' else None
    )
    db.add(conversation)
    db.flush()
    print(f"✅ Conversation de test créée: ID={conversation.id}")
    
    # Créer un message du client
    message = InboxMessage(
        conversation_id=conversation.id,
        from_name=client.name,
        from_email=client.email,
        content="Bonjour, j'aimerais avoir des informations.",
        source="email",
        is_from_client=True,
        read=False
    )
    db.add(message)
    db.commit()
    db.refresh(conversation)
    print(f"✅ Message client créé: ID={message.id}")
    print()
    
    # Tester l'auto-réponse
    print("🔄 Traitement de l'auto-réponse...")
    result = process_auto_reply(db, conversation, folder)
    print(f"   Résultat: {result}")
    print()
    
    # Vérifier l'état de la conversation
    db.refresh(conversation)
    print(f"📊 État de la conversation après auto-réponse:")
    print(f"   auto_reply_sent: {conversation.auto_reply_sent}")
    print(f"   auto_reply_pending: {conversation.auto_reply_pending}")
    print(f"   auto_reply_mode: {conversation.auto_reply_mode}")
    print(f"   pending_auto_reply_content: {'✅ Présent' if conversation.pending_auto_reply_content else '❌ Absent'}")
    if conversation.pending_auto_reply_content:
        print(f"   Contenu: {conversation.pending_auto_reply_content[:100]}...")
    print()
    
    # Vérifier les messages
    messages = db.query(InboxMessage).filter(
        InboxMessage.conversation_id == conversation.id
    ).order_by(InboxMessage.created_at.asc()).all()
    print(f"📨 Messages dans la conversation: {len(messages)}")
    for msg in messages:
        print(f"   - {msg.from_name}: {msg.content[:50]}... (is_from_client={msg.is_from_client})")
    print()
    
    print("=" * 80)
    print("TEST TERMINÉ")
    print("=" * 80)
    
finally:
    db.close()

