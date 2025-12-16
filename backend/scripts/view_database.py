"""
Script pour visualiser le contenu de la base de données.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.db.models.client import Client
from sqlalchemy import inspect


def view_database():
    """Affiche le contenu de la base de données."""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("📊 CONTENU DE LA BASE DE DONNÉES")
        print("=" * 80)
        
        # ========================================================================
        # USERS
        # ========================================================================
        print("\n👥 UTILISATEURS")
        print("-" * 80)
        users = db.query(User).all()
        if users:
            print(f"{'ID':<5} {'Email':<30} {'Nom':<20} {'Rôle':<15} {'Company ID':<12} {'Actif':<8}")
            print("-" * 80)
            for user in users:
                print(f"{user.id:<5} {user.email:<30} {user.full_name or 'N/A':<20} {user.role:<15} {str(user.company_id or 'N/A'):<12} {'Oui' if user.is_active else 'Non':<8}")
        else:
            print("Aucun utilisateur")
        print(f"\nTotal: {len(users)} utilisateur(s)")
        
        # ========================================================================
        # COMPANIES
        # ========================================================================
        print("\n🏢 ENTREPRISES")
        print("-" * 80)
        companies = db.query(Company).all()
        if companies:
            print(f"{'ID':<5} {'Nom':<30} {'Secteur':<20} {'Actif':<8} {'Créé le':<20}")
            print("-" * 80)
            for company in companies:
                print(f"{company.id:<5} {company.name:<30} {company.sector or 'N/A':<20} {'Oui' if company.is_active else 'Non':<8} {str(company.created_at)[:19]:<20}")
        else:
            print("Aucune entreprise")
        print(f"\nTotal: {len(companies)} entreprise(s)")
        
        # ========================================================================
        # COMPANY SETTINGS
        # ========================================================================
        print("\n⚙️  PARAMÈTRES DES ENTREPRISES")
        print("-" * 80)
        settings = db.query(CompanySettings).all()
        if settings:
            print(f"{'ID':<5} {'Company ID':<12} {'Modules activés':<50}")
            print("-" * 80)
            for s in settings:
                modules = s.settings.get("modules", {})
                enabled_modules = [k for k, v in modules.items() if v.get("enabled", False)]
                modules_str = ", ".join(enabled_modules[:3])
                if len(enabled_modules) > 3:
                    modules_str += f" (+{len(enabled_modules) - 3})"
                print(f"{s.id:<5} {s.company_id:<12} {modules_str:<50}")
        else:
            print("Aucun paramètre")
        print(f"\nTotal: {len(settings)} paramètre(s)")
        
        # ========================================================================
        # CLIENTS
        # ========================================================================
        print("\n👤 CLIENTS")
        print("-" * 80)
        clients = db.query(Client).all()
        if clients:
            print(f"{'ID':<5} {'Nom':<30} {'Email':<30} {'Company ID':<12}")
            print("-" * 80)
            for client in clients[:10]:  # Limiter à 10 pour l'affichage
                print(f"{client.id:<5} {client.name:<30} {client.email or 'N/A':<30} {client.company_id:<12}")
            if len(clients) > 10:
                print(f"... et {len(clients) - 10} autre(s) client(s)")
        else:
            print("Aucun client")
        print(f"\nTotal: {len(clients)} client(s)")
        
        # ========================================================================
        # STATISTIQUES GÉNÉRALES
        # ========================================================================
        print("\n📈 STATISTIQUES")
        print("-" * 80)
        
        # Compter les utilisateurs par rôle
        owners = db.query(User).filter(User.role == "owner").count()
        users_count = db.query(User).filter(User.role == "user").count()
        admins = db.query(User).filter(User.role == "super_admin").count()
        
        print(f"Utilisateurs par rôle:")
        print(f"  - Owners: {owners}")
        print(f"  - Users: {users_count}")
        print(f"  - Super Admins: {admins}")
        print(f"  - Total: {owners + users_count + admins}")
        
        print(f"\nEntreprises: {len(companies)}")
        print(f"Clients: {len(clients)}")
        
        # ========================================================================
        # STRUCTURE DES TABLES
        # ========================================================================
        print("\n🗂️  STRUCTURE DES TABLES")
        print("-" * 80)
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        print(f"Tables disponibles: {len(tables)}")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            print(f"  - {table} ({len(columns)} colonnes)")
        
        print("\n" + "=" * 80)
        print("✅ Affichage terminé")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    view_database()

