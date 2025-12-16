"""
Script de synchronisation automatique des intégrations Inbox.
À exécuter via un cron job toutes les 5 minutes (ou selon l'intervalle configuré).

Usage:
    python scripts/sync_inbox_integrations.py

Ou via cron:
    */5 * * * * cd /path/to/backend && python scripts/sync_inbox_integrations.py
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.inbox_integration import InboxIntegration
from app.db.models.company import Company
from app.core.imap_service import fetch_emails_async
from app.db.models.conversation import Conversation, InboxMessage
from app.db.models.client import Client
from datetime import datetime
import asyncio


async def sync_integration(integration: InboxIntegration, db: Session):
    """Synchronise une intégration spécifique."""
    if not integration.is_active:
        return {"status": "skipped", "reason": "not active"}
    
    company = db.query(Company).filter(Company.id == integration.company_id).first()
    if not company:
        return {"status": "error", "reason": "company not found"}
    
    try:
        processed = 0
        errors = []
        
        if integration.integration_type == "imap":
            if not all([integration.imap_server, integration.imap_port, integration.email_address, integration.email_password]):
                return {"status": "error", "reason": "incomplete configuration"}
            
            # Récupérer les emails
            emails = await fetch_emails_async(
                imap_server=integration.imap_server,
                imap_port=integration.imap_port,
                email_address=integration.email_address,
                password=integration.email_password,
                company_code=company.code,
                use_ssl=integration.use_ssl
            )
            
            # Traiter chaque email
            for email_data in emails:
                try:
                    # Identifier ou créer le client
                    from_email = email_data.get("from", {}).get("email")
                    client = None
                    if from_email:
                        client = db.query(Client).filter(
                            Client.company_id == company.id,
                            Client.email == from_email
                        ).first()
                        
                        if not client:
                            client = Client(
                                company_id=company.id,
                                name=email_data.get("from", {}).get("name", from_email.split("@")[0]),
                                email=from_email,
                                type="Client"
                            )
                            db.add(client)
                            db.flush()
                    
                    # Chercher ou créer une conversation
                    subject = email_data.get("subject", "")
                    conversation = None
                    
                    if subject:
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == company.id,
                            Conversation.subject == subject,
                            Conversation.source == "email"
                        ).first()
                    
                    if not conversation:
                        conversation = Conversation(
                            company_id=company.id,
                            client_id=client.id if client else None,
                            subject=subject,
                            status="À répondre",
                            source="email",
                            unread_count=1,
                            last_message_at=datetime.utcnow(),
                        )
                        db.add(conversation)
                        db.flush()
                    
                    # Créer le message
                    content = email_data.get("html_content") or email_data.get("content", "")
                    message = InboxMessage(
                        conversation_id=conversation.id,
                        from_name=email_data.get("from", {}).get("name", from_email or "Inconnu"),
                        from_email=from_email,
                        content=content,
                        source="email",
                        is_from_client=True,
                        read=False,
                        external_id=email_data.get("message_id"),
                        external_metadata={
                            "to": email_data.get("to"),
                        }
                    )
                    db.add(message)
                    
                    conversation.last_message_at = datetime.utcnow()
                    conversation.unread_count += 1
                    
                    db.commit()
                    processed += 1
                    
                except Exception as e:
                    db.rollback()
                    errors.append({
                        "email": email_data.get("from", {}).get("email"),
                        "error": str(e)
                    })
            
            # Mettre à jour le statut
            integration.last_sync_at = datetime.utcnow()
            integration.last_sync_status = "success" if len(errors) == 0 else "partial"
            integration.last_sync_error = None if len(errors) == 0 else f"{len(errors)} errors"
            db.commit()
            
            return {
                "status": "success",
                "processed": processed,
                "total": len(emails),
                "errors": len(errors)
            }
        else:
            return {"status": "skipped", "reason": f"type {integration.integration_type} not implemented"}
            
    except Exception as e:
        integration.last_sync_at = datetime.utcnow()
        integration.last_sync_status = "error"
        integration.last_sync_error = str(e)
        db.commit()
        return {"status": "error", "error": str(e)}


async def sync_all_integrations():
    """Synchronise toutes les intégrations actives."""
    db = SessionLocal()
    try:
        integrations = db.query(InboxIntegration).filter(
            InboxIntegration.is_active == True
        ).all()
        
        print(f"🔄 Synchronisation de {len(integrations)} intégration(s)...")
        
        for integration in integrations:
            # Vérifier si on doit synchroniser (selon l'intervalle)
            if integration.last_sync_at:
                time_since_last_sync = (datetime.utcnow() - integration.last_sync_at).total_seconds() / 60
                if time_since_last_sync < integration.sync_interval_minutes:
                    print(f"⏭️  Intégration '{integration.name}' ignorée (dernière sync il y a {int(time_since_last_sync)} min)")
                    continue
            
            print(f"📧 Synchronisation de '{integration.name}' ({integration.integration_type})...")
            result = await sync_integration(integration, db)
            
            if result["status"] == "success":
                print(f"✅ '{integration.name}': {result.get('processed', 0)} email(s) traité(s)")
            elif result["status"] == "error":
                print(f"❌ '{integration.name}': {result.get('error', 'Unknown error')}")
            else:
                print(f"⏭️  '{integration.name}': {result.get('reason', 'Skipped')}")
        
        print("✅ Synchronisation terminée")
        
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(sync_all_integrations())

