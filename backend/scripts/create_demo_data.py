"""
Script pour créer des données de démo complètes pour les captures d'écran.
Ce script crée des données réalistes pour tous les modules sans affecter les données existantes.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta, date
import random

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.client import Client
from app.db.models.task import Task, TaskStatus, TaskType, TaskPriority
from app.db.models.project import Project, ProjectStatus
from app.db.models.billing import Quote, QuoteStatus, Invoice, InvoiceStatus
from app.db.models.appointment import Appointment, AppointmentType
from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus
from app.core.security import get_password_hash


# Données de démo réalistes
DEMO_CLIENTS = [
    {"name": "Boulangerie Le Pain Doré", "email": "contact@paindore.fr", "phone": "01 23 45 67 89", "address": "12 Rue de la République, 75001 Paris"},
    {"name": "Café des Arts", "email": "info@cafe-des-arts.fr", "phone": "01 34 56 78 90", "address": "45 Avenue des Champs, 75008 Paris"},
    {"name": "Restaurant La Belle Époque", "email": "reservation@belle-epoque.fr", "phone": "01 45 67 89 01", "address": "78 Boulevard Saint-Germain, 75006 Paris"},
    {"name": "Salon de Coiffure Élégance", "email": "contact@elegance-coiffure.fr", "phone": "01 56 78 90 12", "address": "23 Rue de Rivoli, 75004 Paris"},
    {"name": "Boutique Mode & Style", "email": "hello@mode-style.fr", "phone": "01 67 89 01 23", "address": "56 Rue du Faubourg Saint-Antoine, 75011 Paris"},
]

DEMO_TASKS = [
    {"title": "Vérifier stocks presse", "type": TaskType.INTERNE, "priority": TaskPriority.NORMAL, "description": "Faire l'inventaire des produits de presse"},
    {"title": "Commander les manquants", "type": TaskType.FOURNISSEUR, "priority": TaskPriority.HIGH, "description": "Commander les produits manquants identifiés"},
    {"title": "Vérifier stocks cigarettes", "type": TaskType.INTERNE, "priority": TaskPriority.NORMAL, "description": "Contrôler le stock de cigarettes"},
    {"title": "Préparer commande fournisseur", "type": TaskType.FOURNISSEUR, "priority": TaskPriority.HIGH, "description": "Préparer la commande hebdomadaire"},
    {"title": "Nettoyer vitrine", "type": TaskType.INTERNE, "priority": TaskPriority.NORMAL, "description": "Nettoyer et ranger la vitrine"},
    {"title": "Appeler client retard paiement", "type": TaskType.CLIENT, "priority": TaskPriority.CRITICAL, "description": "Relancer le client pour le paiement en retard"},
    {"title": "Mettre à jour les prix", "type": TaskType.INTERNE, "priority": TaskPriority.NORMAL, "description": "Mettre à jour les étiquettes de prix"},
    {"title": "Réceptionner livraison", "type": TaskType.FOURNISSEUR, "priority": TaskPriority.HIGH, "description": "Réceptionner et vérifier la livraison"},
]

DEMO_PROJECTS = [
    {"name": "Rénovation boutique", "description": "Rénovation complète de la boutique principale", "status": ProjectStatus.EN_COURS},
    {"name": "Lancement nouvelle collection", "description": "Préparation du lancement de la nouvelle collection", "status": ProjectStatus.EN_COURS},
    {"name": "Formation équipe", "description": "Formation de l'équipe aux nouveaux produits", "status": ProjectStatus.TERMINE},
]

DEMO_QUOTES = [
    {"client_name": "Boulangerie Le Pain Doré", "amount": 2500.00, "status": "accepté"},
    {"client_name": "Café des Arts", "amount": 1800.00, "status": "envoyé"},
    {"client_name": "Restaurant La Belle Époque", "amount": 3200.00, "status": "accepté"},
]

DEMO_INVOICES = [
    {"client_name": "Boulangerie Le Pain Doré", "amount": 2500.00, "status": "payée"},
    {"client_name": "Café des Arts", "amount": 1800.00, "status": "envoyée"},
    {"client_name": "Restaurant La Belle Époque", "amount": 3200.00, "status": "envoyée"},
]

DEMO_APPOINTMENTS = [
    {"title": "Consultation client", "client_name": "Boulangerie Le Pain Doré", "duration": 60},
    {"title": "Suivi projet", "client_name": "Café des Arts", "duration": 30},
    {"title": "Rendez-vous commercial", "client_name": "Restaurant La Belle Époque", "duration": 45},
]


def create_demo_data(company_id: int, user_id: int):
    """Crée des données de démo pour une entreprise."""
    db = SessionLocal()
    try:
        print(f"\n📦 Création des données de démo pour l'entreprise {company_id}...")
        
        # 1. Créer des clients
        print("\n👥 Création des clients...")
        clients_map = {}
        for client_data in DEMO_CLIENTS:
            existing = db.query(Client).filter(
                Client.company_id == company_id,
                Client.email == client_data["email"]
            ).first()
            
            if not existing:
                client = Client(
                    company_id=company_id,
                    name=client_data["name"],
                    email=client_data["email"],
                    phone=client_data["phone"],
                    address=client_data["address"],
                )
                db.add(client)
                db.flush()
                clients_map[client_data["name"]] = client
                print(f"  ✅ Client créé: {client_data['name']}")
            else:
                clients_map[client_data["name"]] = existing
                print(f"  ℹ️  Client existe déjà: {client_data['name']}")
        
        # 2. Créer des tâches
        print("\n📋 Création des tâches...")
        today = date.today()
        for i, task_data in enumerate(DEMO_TASKS):
            # Répartir les tâches sur plusieurs jours
            due_date = today + timedelta(days=i % 3)
            due_time = f"{9 + (i % 8)}:00"  # Entre 9h et 16h
            
            task = Task(
                company_id=company_id,
                title=task_data["title"],
                description=task_data.get("description", ""),
                type=task_data["type"],
                priority=task_data["priority"].value,
                status=TaskStatus.A_FAIRE if i < 5 else TaskStatus.TERMINE,
                due_date=datetime.combine(due_date, datetime.min.time()),
                due_time=due_time,
                assigned_to_id=user_id,
                created_by_id=user_id,
            )
            db.add(task)
            print(f"  ✅ Tâche créée: {task_data['title']}")
        
        # 3. Créer des projets
        print("\n📁 Création des projets...")
        for project_data in DEMO_PROJECTS:
            # Associer à un client aléatoire (obligatoire)
            if not clients_map:
                print("  ⚠️  Aucun client disponible, projet ignoré")
                continue
            
            client = random.choice(list(clients_map.values()))
            
            project = Project(
                company_id=company_id,
                name=project_data["name"],
                description=project_data["description"],
                client_id=client.id,
                status=project_data["status"],
                start_date=datetime.now() - timedelta(days=random.randint(10, 30)),
                end_date=datetime.now() + timedelta(days=random.randint(10, 60)) if project_data["status"] == ProjectStatus.EN_COURS else datetime.now() - timedelta(days=random.randint(1, 10)),
            )
            db.add(project)
            print(f"  ✅ Projet créé: {project_data['name']}")
        
        # 4. Créer des devis
        print("\n📄 Création des devis...")
        for quote_data in DEMO_QUOTES:
            client = clients_map.get(quote_data["client_name"])
            if not client:
                continue
            
            quote_number = f"DEV-{datetime.now().year}-{random.randint(100, 999)}"
            # Vérifier que le numéro n'existe pas déjà
            while db.query(Quote).filter(Quote.number == quote_number).first():
                quote_number = f"DEV-{datetime.now().year}-{random.randint(100, 999)}"
            
            quote = Quote(
                company_id=company_id,
                client_id=client.id,
                number=quote_number,
                status=QuoteStatus(quote_data["status"]),
                amount=quote_data["amount"],
                total_ttc=quote_data["amount"],
                subtotal_ht=quote_data["amount"] / 1.20,  # Approximation avec TVA 20%
                total_tax=quote_data["amount"] - (quote_data["amount"] / 1.20),
            )
            db.add(quote)
            db.flush()
            
            # Créer une ligne de devis
            from app.db.models.billing import QuoteLine
            quote_line = QuoteLine(
                quote_id=quote.id,
                description="Prestation de service",
                quantity=1,
                unit_price_ht=quote_data["amount"] / 1.20,
                tax_rate=20.0,
                subtotal_ht=quote_data["amount"] / 1.20,
                tax_amount=quote_data["amount"] - (quote_data["amount"] / 1.20),
                total_ttc=quote_data["amount"],
                order=1,
            )
            db.add(quote_line)
            print(f"  ✅ Devis créé: {quote.number} pour {quote_data['client_name']}")
        
        # 5. Créer des factures
        print("\n💰 Création des factures...")
        for invoice_data in DEMO_INVOICES:
            client = clients_map.get(invoice_data["client_name"])
            if not client:
                continue
            
            invoice_number = f"FAC-{datetime.now().year}-{random.randint(100, 999)}"
            # Vérifier que le numéro n'existe pas déjà
            while db.query(Invoice).filter(Invoice.number == invoice_number).first():
                invoice_number = f"FAC-{datetime.now().year}-{random.randint(100, 999)}"
            
            invoice = Invoice(
                company_id=company_id,
                client_id=client.id,
                number=invoice_number,
                status=InvoiceStatus(invoice_data["status"]),
                amount=invoice_data["amount"],  # Conservé pour compatibilité
                total_ttc=invoice_data["amount"],
                subtotal_ht=invoice_data["amount"] / 1.20,  # Approximation avec TVA 20%
                total_tax=invoice_data["amount"] - (invoice_data["amount"] / 1.20),
                due_date=datetime.combine(date.today() + timedelta(days=30), datetime.min.time()),
            )
            db.add(invoice)
            db.flush()
            
            # Créer une ligne de facture
            from app.db.models.billing import InvoiceLine
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                description="Prestation de service",
                quantity=1,
                unit_price_ht=invoice_data["amount"] / 1.20,
                tax_rate=20.0,
                subtotal_ht=invoice_data["amount"] / 1.20,
                tax_amount=invoice_data["amount"] - (invoice_data["amount"] / 1.20),
                total_ttc=invoice_data["amount"],
                order=1,
            )
            db.add(invoice_line)
            print(f"  ✅ Facture créée: {invoice.number} pour {invoice_data['client_name']}")
        
        # 6. Créer des rendez-vous
        print("\n📅 Création des rendez-vous...")
        # Créer d'abord un type de rendez-vous par défaut
        from app.db.models.appointment import AppointmentType
        appointment_type = db.query(AppointmentType).filter(
            AppointmentType.company_id == company_id
        ).first()
        
        if not appointment_type:
            appointment_type = AppointmentType(
                company_id=company_id,
                name="Consultation",
                description="Rendez-vous de consultation",
                duration_minutes=30,
                is_active=True,
            )
            db.add(appointment_type)
            db.flush()
            print("  ✅ Type de rendez-vous créé: Consultation")
        
        for i, appointment_data in enumerate(DEMO_APPOINTMENTS):
            client = clients_map.get(appointment_data["client_name"])
            if not client:
                continue
            
            # Répartir sur plusieurs jours
            appointment_date = datetime.now() + timedelta(days=i + 1)
            start_date_time = datetime.combine(appointment_date.date(), datetime.min.time().replace(hour=10 + i, minute=0))
            end_date_time = start_date_time + timedelta(minutes=appointment_data["duration"])
            
            appointment = Appointment(
                company_id=company_id,
                client_id=client.id,
                type_id=appointment_type.id,
                start_date_time=start_date_time,
                end_date_time=end_date_time,
                employee_id=user_id,
                status="scheduled",
            )
            db.add(appointment)
            print(f"  ✅ Rendez-vous créé: {appointment_data['title']}")
        
        # 7. Créer des relances
        print("\n📧 Création des relances...")
        # Récupérer les factures créées
        invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
        for invoice in invoices:
            if invoice.status == InvoiceStatus.ENVOYEE or invoice.status.value == "envoyée":
                followup = FollowUp(
                    company_id=company_id,
                    client_id=invoice.client_id,
                    type=FollowUpType.FACTURE_IMPAYEE,
                    source_type="invoice",
                    source_id=invoice.id,
                    source_label=f"Facture {invoice.number}",
                    due_date=datetime.combine(date.today() + timedelta(days=random.randint(1, 7)), datetime.min.time()),
                    status=FollowUpStatus.A_FAIRE,
                )
                db.add(followup)
                print(f"  ✅ Relance créée pour la facture {invoice.number}")
        
        db.commit()
        print("\n✅ Toutes les données de démo ont été créées avec succès !")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la création des données de démo: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def main():
    """Fonction principale."""
    print("=" * 60)
    print("🎬 CRÉATION DE DONNÉES DE DÉMO")
    print("=" * 60)
    
    init_db()
    db = SessionLocal()
    
    try:
        # Demander à l'utilisateur quelle entreprise utiliser
        print("\n📋 Entreprises disponibles:")
        companies = db.query(Company).filter(Company.is_active == True).all()
        
        if not companies:
            print("❌ Aucune entreprise active trouvée.")
            print("\n💡 Créez d'abord une entreprise avec un utilisateur owner.")
            return
        
        for i, company in enumerate(companies, 1):
            print(f"  {i}. {company.name} (ID: {company.id})")
        
        choice = input("\n👉 Entrez le numéro de l'entreprise (ou 'all' pour toutes): ").strip()
        
        if choice.lower() == 'all':
            # Créer pour toutes les entreprises
            for company in companies:
                owner = db.query(User).filter(
                    User.company_id == company.id,
                    User.role.in_(["owner", "admin"])
                ).first()
                
                if owner:
                    create_demo_data(company.id, owner.id)
                else:
                    print(f"⚠️  Aucun owner/admin trouvé pour {company.name}")
        else:
            try:
                index = int(choice) - 1
                if 0 <= index < len(companies):
                    company = companies[index]
                    owner = db.query(User).filter(
                        User.company_id == company.id,
                        User.role.in_(["owner", "admin"])
                    ).first()
                    
                    if owner:
                        create_demo_data(company.id, owner.id)
                    else:
                        print(f"❌ Aucun owner/admin trouvé pour {company.name}")
                else:
                    print("❌ Numéro invalide.")
            except ValueError:
                print("❌ Entrée invalide.")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
