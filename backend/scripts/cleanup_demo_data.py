"""
Script pour supprimer toutes les données fictives créées pour les démos.
Supprime les clients, devis, factures, relances, tâches, conversations, etc.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.client import Client
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine, QuoteSignature, QuoteSignatureAuditLog, InvoicePayment
from app.db.models.followup import FollowUp, FollowUpHistory
from app.db.models.task import Task
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InternalNote
from app.db.models.project import Project, ProjectHistory
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.quote_otp import QuoteOTP
from app.db.models.appointment import Appointment


def cleanup_demo_data(company_id: int = 6):
    """Supprime toutes les données fictives de l'entreprise."""
    init_db()
    db = SessionLocal()
    
    try:
        print(f"\n🧹 Nettoyage des données fictives pour l'entreprise ID {company_id}...")
        
        # ==================== RELANCES ====================
        print("\n📧 Suppression des relances...")
        
        # Supprimer tous les historiques de relances
        all_history = db.query(FollowUpHistory).filter(FollowUpHistory.company_id == company_id).all()
        for history in all_history:
            db.delete(history)
        db.flush()
        print(f"  ✅ {len(all_history)} historiques de relances supprimés")
        
        # Supprimer toutes les relances
        all_followups = db.query(FollowUp).filter(FollowUp.company_id == company_id).all()
        for followup in all_followups:
            db.delete(followup)
        db.flush()
        print(f"  ✅ {len(all_followups)} relances supprimées")
        
        # ==================== CONVERSATIONS ====================
        print("\n💬 Suppression des conversations...")
        
        all_conversations = db.query(Conversation).filter(Conversation.company_id == company_id).all()
        conversation_ids = [c.id for c in all_conversations]
        
        if conversation_ids:
            # Supprimer les pièces jointes
            attachments = db.query(MessageAttachment).filter(
                MessageAttachment.message_id.in_(
                    db.query(InboxMessage.id).filter(InboxMessage.conversation_id.in_(conversation_ids))
                )
            ).all()
            for attachment in attachments:
                db.delete(attachment)
            db.flush()
            print(f"  ✅ {len(attachments)} pièces jointes supprimées")
            
            # Supprimer les notes internes
            notes = db.query(InternalNote).filter(InternalNote.conversation_id.in_(conversation_ids)).all()
            for note in notes:
                db.delete(note)
            db.flush()
            print(f"  ✅ {len(notes)} notes internes supprimées")
            
            # Supprimer les messages
            messages = db.query(InboxMessage).filter(InboxMessage.conversation_id.in_(conversation_ids)).all()
            for message in messages:
                db.delete(message)
            db.flush()
            print(f"  ✅ {len(messages)} messages supprimés")
        
        # Supprimer les conversations
        for conversation in all_conversations:
            db.delete(conversation)
        db.flush()
        print(f"  ✅ {len(all_conversations)} conversations supprimées")
        
        # ==================== TÂCHES ====================
        print("\n✅ Suppression des tâches...")
        
        all_tasks = db.query(Task).filter(Task.company_id == company_id).all()
        for task in all_tasks:
            db.delete(task)
        db.flush()
        print(f"  ✅ {len(all_tasks)} tâches supprimées")
        
        # ==================== FACTURES ====================
        print("\n💰 Suppression des factures...")
        
        all_invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
        invoice_ids = [inv.id for inv in all_invoices]
        
        if invoice_ids:
            # Supprimer les paiements
            payments = db.query(InvoicePayment).filter(InvoicePayment.invoice_id.in_(invoice_ids)).all()
            for payment in payments:
                db.delete(payment)
            db.flush()
            print(f"  ✅ {len(payments)} paiements supprimés")
            
            # Supprimer les lignes
            invoice_lines = db.query(InvoiceLine).filter(InvoiceLine.invoice_id.in_(invoice_ids)).all()
            for line in invoice_lines:
                db.delete(line)
            db.flush()
            print(f"  ✅ {len(invoice_lines)} lignes de factures supprimées")
            
            # Supprimer les logs d'audit
            audit_logs = db.query(InvoiceAuditLog).filter(InvoiceAuditLog.invoice_id.in_(invoice_ids)).all()
            for log in audit_logs:
                db.delete(log)
            db.flush()
            print(f"  ✅ {len(audit_logs)} logs d'audit de factures supprimés")
        
        # Supprimer les factures
        for invoice in all_invoices:
            db.delete(invoice)
        db.flush()
        print(f"  ✅ {len(all_invoices)} factures supprimées")
        
        # ==================== DEVIS ====================
        print("\n📄 Suppression des devis...")
        
        all_quotes = db.query(Quote).filter(Quote.company_id == company_id).all()
        quote_ids = [q.id for q in all_quotes]
        
        if quote_ids:
            # Supprimer les signatures
            signatures = db.query(QuoteSignature).filter(QuoteSignature.quote_id.in_(quote_ids)).all()
            for signature in signatures:
                db.delete(signature)
            db.flush()
            print(f"  ✅ {len(signatures)} signatures supprimées")
            
            # Supprimer les logs d'audit
            audit_logs = db.query(QuoteSignatureAuditLog).filter(QuoteSignatureAuditLog.quote_id.in_(quote_ids)).all()
            for log in audit_logs:
                db.delete(log)
            db.flush()
            print(f"  ✅ {len(audit_logs)} logs d'audit de devis supprimés")
            
            # Supprimer les OTP
            otps = db.query(QuoteOTP).filter(QuoteOTP.quote_id.in_(quote_ids)).all()
            for otp in otps:
                db.delete(otp)
            db.flush()
            print(f"  ✅ {len(otps)} OTP de devis supprimés")
            
            # Supprimer les lignes
            quote_lines = db.query(QuoteLine).filter(QuoteLine.quote_id.in_(quote_ids)).all()
            for line in quote_lines:
                db.delete(line)
            db.flush()
            print(f"  ✅ {len(quote_lines)} lignes de devis supprimées")
        
        # Supprimer les devis
        for quote in all_quotes:
            db.delete(quote)
        db.flush()
        print(f"  ✅ {len(all_quotes)} devis supprimés")
        
        # ==================== PROJETS ====================
        print("\n📁 Suppression des projets...")
        
        all_projects = db.query(Project).filter(Project.company_id == company_id).all()
        project_ids = [p.id for p in all_projects]
        
        if project_ids:
            # Supprimer les historiques
            project_history = db.query(ProjectHistory).filter(ProjectHistory.project_id.in_(project_ids)).all()
            for history in project_history:
                db.delete(history)
            db.flush()
            print(f"  ✅ {len(project_history)} historiques de projets supprimés")
        
        # Supprimer les projets
        for project in all_projects:
            db.delete(project)
        db.flush()
        print(f"  ✅ {len(all_projects)} projets supprimés")
        
        # ==================== RENDEZ-VOUS ====================
        print("\n📅 Suppression des rendez-vous...")
        
        all_appointments = db.query(Appointment).filter(Appointment.company_id == company_id).all()
        for appointment in all_appointments:
            db.delete(appointment)
        db.flush()
        print(f"  ✅ {len(all_appointments)} rendez-vous supprimés")
        
        # ==================== CLIENTS ====================
        print("\n👥 Suppression des clients...")
        
        all_clients = db.query(Client).filter(Client.company_id == company_id).all()
        for client in all_clients:
            db.delete(client)
        db.flush()
        print(f"  ✅ {len(all_clients)} clients supprimés")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Nettoyage terminé avec succès !")
        print("="*60)
        print(f"\n📊 Résumé des suppressions:")
        print(f"   - Clients: {len(all_clients)}")
        print(f"   - Devis: {len(all_quotes)}")
        print(f"   - Factures: {len(all_invoices)}")
        print(f"   - Relances: {len(all_followups)}")
        print(f"   - Tâches: {len(all_tasks)}")
        print(f"   - Conversations: {len(all_conversations)}")
        print(f"   - Projets: {len(all_projects)}")
        print(f"   - Rendez-vous: {len(all_appointments)}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du nettoyage: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    company_id = 6
    if len(sys.argv) > 1:
        try:
            company_id = int(sys.argv[1])
        except ValueError:
            print("❌ L'ID de l'entreprise doit être un nombre")
            sys.exit(1)
    
    # Demander confirmation
    print(f"\n⚠️  ATTENTION : Ce script va supprimer TOUTES les données de l'entreprise ID {company_id}")
    print("   Cela inclut : clients, devis, factures, relances, tâches, conversations, projets, rendez-vous")
    response = input("\nÊtes-vous sûr de vouloir continuer ? (tapez 'OUI' en majuscules pour confirmer): ")
    
    if response != "OUI":
        print("❌ Nettoyage annulé.")
        sys.exit(0)
    
    cleanup_demo_data(company_id)
