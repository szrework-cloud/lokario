"""
Script pour supprimer tous les clients et créer 7 clients fictifs.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.client import Client
from app.db.models.followup import FollowUp
from app.db.models.project import Project, ProjectHistory
from app.db.models.billing import Quote, Invoice, InvoicePayment, QuoteLine, InvoiceLine, QuoteSignature, QuoteSignatureAuditLog
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.quote_otp import QuoteOTP
from app.db.models.appointment import Appointment


# Clients fictifs réalistes
DEMO_CLIENTS = [
    {
        "name": "Sophie Martin",
        "email": "sophie.martin@example.com",
        "phone": "+33 6 12 34 56 78",
        "sector": "Commerce",
        "address": "15 Rue de la République, 75001 Paris",
        "notes": "Client régulier depuis 2 ans. Très satisfait des services.",
        "type": "Client",
        "tags": ["VIP", "régulier"],
    },
    {
        "name": "Thomas Dubois",
        "email": "thomas.dubois@example.com",
        "phone": "+33 6 23 45 67 89",
        "sector": "Beauté",
        "address": "42 Avenue des Champs-Élysées, 75008 Paris",
        "notes": "Nouveau client. Première commande en attente.",
        "type": "Client",
        "tags": ["nouveau"],
    },
    {
        "name": "Marie Leroy",
        "email": "marie.leroy@example.com",
        "phone": "+33 6 34 56 78 90",
        "sector": "Restauration",
        "address": "8 Rue du Commerce, 69001 Lyon",
        "notes": "Client fidèle. Commandes mensuelles régulières.",
        "type": "Client",
        "tags": ["régulier"],
    },
    {
        "name": "Pierre Bernard",
        "email": "pierre.bernard@example.com",
        "phone": "+33 6 45 67 89 01",
        "sector": "Services",
        "address": "25 Boulevard Saint-Michel, 13001 Marseille",
        "notes": "Entreprise en croissance. Besoin de services personnalisés.",
        "type": "Client",
        "tags": ["VIP"],
    },
    {
        "name": "Julie Moreau",
        "email": "julie.moreau@example.com",
        "phone": "+33 6 56 78 90 12",
        "sector": "Commerce",
        "address": "12 Place Bellecour, 69002 Lyon",
        "notes": "Client occasionnel. Contacté 3 fois cette année.",
        "type": "Client",
        "tags": [],
    },
    {
        "name": "Nicolas Petit",
        "email": "nicolas.petit@example.com",
        "phone": "+33 6 67 89 01 23",
        "sector": "Beauté",
        "address": "30 Rue de la Paix, 33000 Bordeaux",
        "notes": "Nouveau prospect. En cours de négociation.",
        "type": "Client",
        "tags": ["nouveau"],
    },
    {
        "name": "Isabelle Roux",
        "email": "isabelle.roux@example.com",
        "phone": "+33 6 78 90 12 34",
        "sector": "Restauration",
        "address": "5 Rue de la Victoire, 31000 Toulouse",
        "notes": "Client premium. Commandes importantes et fréquentes.",
        "type": "Client",
        "tags": ["VIP", "régulier"],
    },
]


def setup_demo_clients(company_id: int = None):
    """Supprime tous les clients et crée 7 clients fictifs."""
    init_db()
    db = SessionLocal()
    
    try:
        if company_id:
            print(f"\n👥 Configuration des clients pour l'entreprise ID {company_id}...")
        else:
            print(f"\n👥 Configuration des clients pour toutes les entreprises...")
        
        # 1. Supprimer tous les clients (en gérant les références)
        print("\n🗑️  Suppression des clients existants...")
        
        if company_id:
            clients_to_delete = db.query(Client).filter(Client.company_id == company_id).all()
            client_ids = [c.id for c in clients_to_delete]
        else:
            clients_to_delete = db.query(Client).all()
            client_ids = [c.id for c in clients_to_delete]
        
        if clients_to_delete:
            # Supprimer les followups associés (client_id est NOT NULL)
            if client_ids:
                followups = db.query(FollowUp).filter(FollowUp.client_id.in_(client_ids)).all()
                for followup in followups:
                    db.delete(followup)
                db.flush()
                print(f"  ℹ️  {len(followups)} followup(s) supprimé(s)")
            
            # Supprimer les rendez-vous associés (client_id est NOT NULL)
            if client_ids:
                appointments = db.query(Appointment).filter(Appointment.client_id.in_(client_ids)).all()
                for appointment in appointments:
                    db.delete(appointment)
                db.flush()
                print(f"  ℹ️  {len(appointments)} rendez-vous supprimé(s)")
            
            # Supprimer les projets associés (et leurs historiques)
            if client_ids:
                projects = db.query(Project).filter(Project.client_id.in_(client_ids)).all()
                project_ids = [p.id for p in projects]
                
                # Supprimer les historiques de projets AVANT les projets
                if project_ids:
                    project_history = db.query(ProjectHistory).filter(ProjectHistory.project_id.in_(project_ids)).all()
                    for history in project_history:
                        db.delete(history)
                    db.flush()
                    print(f"  ℹ️  {len(project_history)} historique(s) de projet supprimé(s)")
                
                for project in projects:
                    db.delete(project)
                db.flush()
                print(f"  ℹ️  {len(projects)} projet(s) supprimé(s)")
            
            # Supprimer les devis associés (et leurs lignes, signatures, audit logs)
            if client_ids:
                quotes = db.query(Quote).filter(Quote.client_id.in_(client_ids)).all()
                quote_ids = [q.id for q in quotes]
                
                # Supprimer les signatures de devis AVANT les devis
                if quote_ids:
                    quote_signatures = db.query(QuoteSignature).filter(QuoteSignature.quote_id.in_(quote_ids)).all()
                    for signature in quote_signatures:
                        db.delete(signature)
                    db.flush()
                    print(f"  ℹ️  {len(quote_signatures)} signature(s) de devis supprimée(s)")
                
                # Supprimer les logs d'audit de devis AVANT les devis
                if quote_ids:
                    quote_audit_logs = db.query(QuoteSignatureAuditLog).filter(QuoteSignatureAuditLog.quote_id.in_(quote_ids)).all()
                    for log in quote_audit_logs:
                        db.delete(log)
                    db.flush()
                    print(f"  ℹ️  {len(quote_audit_logs)} log(s) d'audit de devis supprimé(s)")
                
                # Supprimer les OTP de devis AVANT les devis
                if quote_ids:
                    quote_otps = db.query(QuoteOTP).filter(QuoteOTP.quote_id.in_(quote_ids)).all()
                    for otp in quote_otps:
                        db.delete(otp)
                    db.flush()
                    print(f"  ℹ️  {len(quote_otps)} OTP(s) de devis supprimé(s)")
                
                # Supprimer les lignes de devis AVANT les devis
                if quote_ids:
                    quote_lines = db.query(QuoteLine).filter(QuoteLine.quote_id.in_(quote_ids)).all()
                    for line in quote_lines:
                        db.delete(line)
                    db.flush()
                    print(f"  ℹ️  {len(quote_lines)} ligne(s) de devis supprimée(s)")
                
                for quote in quotes:
                    db.delete(quote)
                db.flush()
                print(f"  ℹ️  {len(quotes)} devis supprimé(s)")
            
            # Supprimer les factures associées (et leurs paiements et lignes)
            if client_ids:
                invoices = db.query(Invoice).filter(Invoice.client_id.in_(client_ids)).all()
                invoice_ids = [inv.id for inv in invoices]
                
                # Supprimer les paiements de factures AVANT les factures
                if invoice_ids:
                    payments = db.query(InvoicePayment).filter(InvoicePayment.invoice_id.in_(invoice_ids)).all()
                    for payment in payments:
                        db.delete(payment)
                    db.flush()
                    print(f"  ℹ️  {len(payments)} paiement(s) de facture supprimé(s)")
                
                # Supprimer les lignes de factures AVANT les factures
                if invoice_ids:
                    invoice_lines = db.query(InvoiceLine).filter(InvoiceLine.invoice_id.in_(invoice_ids)).all()
                    for line in invoice_lines:
                        db.delete(line)
                    db.flush()
                    print(f"  ℹ️  {len(invoice_lines)} ligne(s) de facture supprimée(s)")
                
                # Supprimer les logs d'audit des factures AVANT les factures
                if invoice_ids:
                    audit_logs = db.query(InvoiceAuditLog).filter(InvoiceAuditLog.invoice_id.in_(invoice_ids)).all()
                    for log in audit_logs:
                        db.delete(log)
                    db.flush()
                    print(f"  ℹ️  {len(audit_logs)} log(s) d'audit de facture supprimé(s)")
                
                for invoice in invoices:
                    db.delete(invoice)
                db.flush()
                print(f"  ℹ️  {len(invoices)} facture(s) supprimée(s)")
            
            # Maintenant supprimer les clients
            for client in clients_to_delete:
                db.delete(client)
            db.commit()
            print(f"  ✅ {len(clients_to_delete)} client(s) supprimé(s)")
        else:
            print("  ℹ️  Aucun client existant à supprimer")
        
        # 2. Créer les 7 nouveaux clients fictifs
        print("\n✨ Création de 7 clients fictifs...")
        
        if not company_id:
            # Si pas d'entreprise spécifiée, demander à l'utilisateur
            print("\n⚠️  Aucune entreprise spécifiée. Veuillez fournir un company_id.")
            print("   Usage: python3 scripts/setup_demo_clients.py <company_id>")
            return
        
        for i, client_data in enumerate(DEMO_CLIENTS, 1):
            client = Client(
                company_id=company_id,
                name=client_data["name"],
                email=client_data["email"],
                phone=client_data["phone"],
                sector=client_data["sector"],
                address=client_data["address"],
                notes=client_data["notes"],
                type=client_data["type"],
                tags=client_data["tags"],
            )
            db.add(client)
            print(f"  ✅ Client créé: {client_data['name']} ({client_data['sector']})")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Configuration terminée avec succès !")
        print("="*60)
        print(f"\n📊 Résumé:")
        print(f"   - Nouveaux clients créés: {len(DEMO_CLIENTS)}")
        print(f"   - Entreprise ID: {company_id}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la configuration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    company_id = None
    if len(sys.argv) > 1:
        try:
            company_id = int(sys.argv[1])
        except ValueError:
            print("❌ L'ID de l'entreprise doit être un nombre")
            sys.exit(1)
    else:
        print("⚠️  Veuillez spécifier l'ID de l'entreprise")
        print("   Usage: python3 scripts/setup_demo_clients.py <company_id>")
        print("   Exemple: python3 scripts/setup_demo_clients.py 6")
        sys.exit(1)
    
    setup_demo_clients(company_id)
