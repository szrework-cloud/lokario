#!/usr/bin/env python3
"""
Script pour supprimer tous les clients avec un email spécifique.

Usage:
    python scripts/delete_clients_by_email.py adem.gurler47@gmail.com
"""

import sys
import os

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.client import Client
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine
from app.db.models.project import Project
from app.db.models.task import Task
from app.db.models.conversation import Conversation


def delete_clients_by_email(email: str):
    """
    Supprime tous les clients avec l'email spécifié et leurs données associées.
    """
    db = SessionLocal()
    
    try:
        # Trouver tous les clients avec cet email
        clients = db.query(Client).filter(Client.email == email).all()
        
        if not clients:
            print(f"❌ Aucun client trouvé avec l'email: {email}")
            return
        
        print(f"📋 {len(clients)} client(s) trouvé(s) avec l'email: {email}")
        
        deleted_count = 0
        
        for client in clients:
            client_id = client.id
            company_id = client.company_id
            
            print(f"\n🗑️  Suppression du client ID {client_id} (email: {client.email})...")
            
            # Supprimer les devis associés
            quotes = db.query(Quote).filter(Quote.client_id == client_id).all()
            for quote in quotes:
                # Supprimer les lignes de devis
                quote_lines = db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).all()
                for line in quote_lines:
                    db.delete(line)
                db.delete(quote)
                print(f"  ✓ Devis {quote.id} supprimé")
            
            # Supprimer les factures associées (ou les détacher)
            invoices = db.query(Invoice).filter(Invoice.client_id == client_id).all()
            for invoice in invoices:
                # Détacher le client plutôt que de supprimer la facture (obligation légale)
                invoice.client_id = None
                print(f"  ✓ Facture {invoice.id} détachée du client")
            
            # Supprimer les projets associés
            projects = db.query(Project).filter(Project.client_id == client_id).all()
            for project in projects:
                db.delete(project)
                print(f"  ✓ Projet {project.id} supprimé")
            
            # Supprimer les tâches associées
            tasks = db.query(Task).filter(Task.client_id == client_id).all()
            for task in tasks:
                db.delete(task)
                print(f"  ✓ Tâche {task.id} supprimée")
            
            # Supprimer les conversations associées
            conversations = db.query(Conversation).filter(Conversation.client_id == client_id).all()
            for conversation in conversations:
                db.delete(conversation)
                print(f"  ✓ Conversation {conversation.id} supprimée")
            
            # Supprimer le client
            db.delete(client)
            deleted_count += 1
            print(f"  ✅ Client {client_id} supprimé avec succès")
        
        db.commit()
        print(f"\n✅ {deleted_count} client(s) supprimé(s) avec succès!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la suppression: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/delete_clients_by_email.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    print(f"🔍 Recherche des clients avec l'email: {email}")
    delete_clients_by_email(email)


if __name__ == "__main__":
    main()

