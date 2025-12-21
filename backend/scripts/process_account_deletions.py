"""
Script pour traiter les suppressions de comptes programmées.
À exécuter quotidiennement via un cron job.

Supprime définitivement les comptes dont la date de suppression programmée est passée.
"""
import sys
from pathlib import Path
from datetime import datetime

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.client import Client
from app.db.models.project import Project, ProjectHistory
from app.db.models.task import Task
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine, QuoteSignature, QuoteSignatureAuditLog, InvoicePayment
from app.db.models.quote_otp import QuoteOTP
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.followup import FollowUp, FollowUpHistory
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InternalNote
from app.db.models.appointment import Appointment


def process_account_deletions():
    """
    Traite les suppressions de comptes programmées.
    Supprime définitivement les comptes dont deletion_scheduled_at est dans le passé.
    """
    init_db()
    db = SessionLocal()
    
    try:
        now = datetime.now()
        
        # Trouver tous les comptes dont la date de suppression est passée
        users_to_delete = db.query(User).filter(
            User.deletion_scheduled_at.isnot(None),
            User.deletion_scheduled_at <= now
        ).all()
        
        if not users_to_delete:
            print(f"✅ Aucun compte à supprimer (vérifié à {now.isoformat()})")
            return
        
        print(f"🗑️  {len(users_to_delete)} compte(s) à supprimer définitivement")
        
        for user in users_to_delete:
            print(f"\n📋 Traitement du compte: {user.email} (ID: {user.id})")
            
            if not user.company_id:
                # Si pas d'entreprise, supprimer juste l'utilisateur
                db.delete(user)
                db.flush()
                print(f"   ✅ Utilisateur sans entreprise supprimé")
                continue
            
            company_id = user.company_id
            
            # Vérifier s'il y a d'autres utilisateurs dans l'entreprise
            other_users = db.query(User).filter(
                User.company_id == company_id,
                User.id != user.id
            ).count()
            
            is_only_user = other_users == 0
            
            if is_only_user:
                print(f"   ℹ️  Utilisateur seul dans l'entreprise - suppression de toutes les données")
                
                # Relances
                followups = db.query(FollowUp).filter(FollowUp.company_id == company_id).all()
                for followup in followups:
                    history = db.query(FollowUpHistory).filter(FollowUpHistory.followup_id == followup.id).all()
                    for h in history:
                        db.delete(h)
                    db.delete(followup)
                if followups:
                    print(f"   ✅ {len(followups)} relance(s) supprimée(s)")
                
                # Projets
                projects = db.query(Project).filter(Project.company_id == company_id).all()
                for project in projects:
                    history = db.query(ProjectHistory).filter(ProjectHistory.project_id == project.id).all()
                    for h in history:
                        db.delete(h)
                    db.delete(project)
                if projects:
                    print(f"   ✅ {len(projects)} projet(s) supprimé(s)")
                
                # Tâches
                tasks = db.query(Task).filter(Task.company_id == company_id).all()
                for task in tasks:
                    db.delete(task)
                if tasks:
                    print(f"   ✅ {len(tasks)} tâche(s) supprimée(s)")
                
                # Conversations
                conversations = db.query(Conversation).filter(Conversation.company_id == company_id).all()
                for conversation in conversations:
                    messages = db.query(InboxMessage).filter(InboxMessage.conversation_id == conversation.id).all()
                    for message in messages:
                        attachments = db.query(MessageAttachment).filter(MessageAttachment.message_id == message.id).all()
                        for att in attachments:
                            db.delete(att)
                        db.delete(message)
                    notes = db.query(InternalNote).filter(InternalNote.conversation_id == conversation.id).all()
                    for note in notes:
                        db.delete(note)
                    db.delete(conversation)
                if conversations:
                    print(f"   ✅ {len(conversations)} conversation(s) supprimée(s)")
                
                # Devis
                quotes = db.query(Quote).filter(Quote.company_id == company_id).all()
                for quote in quotes:
                    signatures = db.query(QuoteSignature).filter(QuoteSignature.quote_id == quote.id).all()
                    for sig in signatures:
                        audit_logs = db.query(QuoteSignatureAuditLog).filter(QuoteSignatureAuditLog.quote_id == quote.id).all()
                        for log in audit_logs:
                            db.delete(log)
                        db.delete(sig)
                    otps = db.query(QuoteOTP).filter(QuoteOTP.quote_id == quote.id).all()
                    for otp in otps:
                        db.delete(otp)
                    lines = db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).all()
                    for line in lines:
                        db.delete(line)
                    db.delete(quote)
                if quotes:
                    print(f"   ✅ {len(quotes)} devis supprimé(s)")
                
                # Factures : ANONYMIser plutôt que supprimer (obligation légale)
                invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
                for invoice in invoices:
                    if invoice.notes:
                        invoice.notes = "[Données anonymisées - compte supprimé]"
                if invoices:
                    print(f"   ✅ {len(invoices)} facture(s) anonymisée(s) (conservées pour obligations légales)")
                
                # Clients
                clients = db.query(Client).filter(Client.company_id == company_id).all()
                for client in clients:
                    db.delete(client)
                if clients:
                    print(f"   ✅ {len(clients)} client(s) supprimé(s)")
                
                # Rendez-vous
                appointments = db.query(Appointment).filter(Appointment.company_id == company_id).all()
                for appointment in appointments:
                    db.delete(appointment)
                if appointments:
                    print(f"   ✅ {len(appointments)} rendez-vous supprimé(s)")
            else:
                print(f"   ℹ️  Autres utilisateurs dans l'entreprise - seul l'utilisateur sera supprimé")
            
            # Supprimer l'utilisateur
            db.delete(user)
            db.flush()
            print(f"   ✅ Utilisateur supprimé")
        
        db.commit()
        
        print(f"\n" + "="*60)
        print(f"✅ Traitement terminé: {len(users_to_delete)} compte(s) supprimé(s)")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    process_account_deletions()

