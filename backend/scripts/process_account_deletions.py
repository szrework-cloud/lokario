#!/usr/bin/env python3
"""
Script pour supprimer définitivement les comptes marqués pour suppression
après la période de grâce de 30 jours.

Ce script doit être exécuté quotidiennement via un cron job.

Usage:
    python scripts/process_account_deletions.py

Variables d'environnement requises:
    - DATABASE_URL: URL de connexion à la base de données
"""

import sys
import os
from datetime import datetime, timedelta

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.db.models.client import Client
from app.db.models.project import Project, ProjectHistory
from app.db.models.task import Task
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine, QuoteSignature, QuoteSignatureAuditLog, InvoicePayment
from app.db.models.quote_otp import QuoteOTP
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.followup import FollowUp, FollowUpHistory
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InternalNote
from app.db.models.appointment import Appointment


def delete_user_permanently(db: Session, user: User):
    """
    Supprime définitivement un utilisateur et ses données.
    """
    user_id = user.id
    
    if not user.company_id:
        # Si pas d'entreprise, supprimer juste l'utilisateur
        db.delete(user)
        return
    
    company_id = user.company_id
    
    # Vérifier s'il y a d'autres utilisateurs dans l'entreprise
    other_users = db.query(User).filter(
        User.company_id == company_id,
        User.id != user_id
    ).count()
    
    is_only_user = other_users == 0
    
    if is_only_user:
        # Si c'est le seul utilisateur, supprimer toutes les données de l'entreprise
        # SAUF les factures qui doivent être conservées (obligation légale)
        
        # Relances
        followups = db.query(FollowUp).filter(FollowUp.company_id == company_id).all()
        for followup in followups:
            history = db.query(FollowUpHistory).filter(FollowUpHistory.followup_id == followup.id).all()
            for h in history:
                db.delete(h)
            db.delete(followup)
        
        # Projets
        projects = db.query(Project).filter(Project.company_id == company_id).all()
        for project in projects:
            history = db.query(ProjectHistory).filter(ProjectHistory.project_id == project.id).all()
            for h in history:
                db.delete(h)
            db.delete(project)
        
        # Tâches
        tasks = db.query(Task).filter(Task.company_id == company_id).all()
        for task in tasks:
            db.delete(task)
        
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
        
        # Factures : ANONYMIser plutôt que supprimer (obligation légale de conservation 10 ans)
        invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
        for invoice in invoices:
            if invoice.notes:
                invoice.notes = "[Données anonymisées - compte supprimé]"
        
        # Clients
        clients = db.query(Client).filter(Client.company_id == company_id).all()
        for client in clients:
            db.delete(client)
        
        # Rendez-vous
        appointments = db.query(Appointment).filter(Appointment.company_id == company_id).all()
        for appointment in appointments:
            db.delete(appointment)
        
        # Supprimer l'entreprise et ses settings
        company_settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
        if company_settings:
            db.delete(company_settings)
        
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            db.delete(company)
    
    # Supprimer l'utilisateur
    db.delete(user)


def main():
    """
    Traite les suppressions de comptes en attente.
    """
    db = SessionLocal()
    
    try:
        # Récupérer tous les utilisateurs dont la date de suppression est passée
        now = datetime.now()
        users_to_delete = db.query(User).filter(
            User.deletion_scheduled_at.isnot(None),
            User.deletion_scheduled_at <= now
        ).all()
        
        if not users_to_delete:
            print(f"[{now.isoformat()}] Aucun compte à supprimer.")
            return
        
        print(f"[{now.isoformat()}] {len(users_to_delete)} compte(s) à supprimer définitivement.")
        
        deleted_count = 0
        error_count = 0
        
        for user in users_to_delete:
            try:
                print(f"  - Suppression du compte {user.email} (ID: {user.id})...")
                delete_user_permanently(db, user)
                db.commit()
                deleted_count += 1
                print(f"    ✓ Compte supprimé avec succès.")
            except Exception as e:
                db.rollback()
                error_count += 1
                print(f"    ✗ Erreur lors de la suppression: {e}")
        
        print(f"\n[{now.isoformat()}] Traitement terminé:")
        print(f"  - {deleted_count} compte(s) supprimé(s) avec succès")
        print(f"  - {error_count} erreur(s)")
        
    except Exception as e:
        db.rollback()
        print(f"[{datetime.now().isoformat()}] Erreur fatale: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

