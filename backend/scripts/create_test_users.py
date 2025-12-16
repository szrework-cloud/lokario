"""
Script pour créer des utilisateurs de test avec les 3 rôles différents.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.user import User
from app.db.models.company import Company
from app.core.security import get_password_hash
import random


def create_test_users():
    """Crée des utilisateurs de test pour chaque rôle."""
    # Initialiser la DB
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Super Admin (déjà créé normalement, mais on vérifie)
        existing_admin = db.query(User).filter(User.email == "admin@localassistant.fr").first()
        if not existing_admin:
            super_admin = User(
                email="admin@localassistant.fr",
                hashed_password=get_password_hash("admin123"),
                full_name="Super Admin",
                role="super_admin",
                company_id=None,
                is_active=True
            )
            db.add(super_admin)
            print("✅ Super admin créé")
        else:
            print("ℹ️  Super admin existe déjà")
        
        # 2. Owner avec une entreprise
        existing_owner = db.query(User).filter(User.email == "owner@example.com").first()
        if not existing_owner:
            # Générer un code unique à 6 chiffres
            company_code = f"{random.randint(100000, 999999)}"
            # Vérifier que le code n'existe pas déjà
            while db.query(Company).filter(Company.code == company_code).first():
                company_code = f"{random.randint(100000, 999999)}"
            
            # Créer l'entreprise
            company = Company(
                code=company_code,
                name="Ma Boulangerie",
                sector="Commerce",
                is_active=True
            )
            db.add(company)
            db.flush()  # Pour obtenir l'ID sans commit
            
            owner = User(
                email="owner@example.com",
                hashed_password=get_password_hash("owner123"),
                full_name="Propriétaire Test",
                role="owner",
                company_id=company.id,
                is_active=True
            )
            db.add(owner)
            print("✅ Owner créé avec entreprise")
        else:
            print("ℹ️  Owner existe déjà")
        
        # 3. User (employé) dans la même entreprise
        existing_user = db.query(User).filter(User.email == "user@example.com").first()
        if not existing_user:
            # Récupérer l'entreprise créée précédemment ou en créer une nouvelle
            company = db.query(Company).filter(Company.name == "Ma Boulangerie").first()
            if not company:
                # Générer un code unique à 6 chiffres
                company_code = f"{random.randint(100000, 999999)}"
                while db.query(Company).filter(Company.code == company_code).first():
                    company_code = f"{random.randint(100000, 999999)}"
                
                company = Company(
                    code=company_code,
                    name="Ma Boulangerie",
                    sector="Commerce",
                    is_active=True
                )
                db.add(company)
                db.flush()
            
            user = User(
                email="user@example.com",
                hashed_password=get_password_hash("user123"),
                full_name="Employé Test",
                role="user",
                company_id=company.id,
                is_active=True
            )
            db.add(user)
            print("✅ User créé")
        else:
            print("ℹ️  User existe déjà")
        
        db.commit()
        
        print("\n" + "="*50)
        print("📋 Comptes de test créés :")
        print("="*50)
        print("\n1. SUPER ADMIN")
        print("   Email: admin@localassistant.fr")
        print("   Password: admin123")
        print("   Rôle: super_admin")
        print("   Accès: /admin/* et /app/*")
        
        print("\n2. OWNER")
        print("   Email: owner@example.com")
        print("   Password: owner123")
        print("   Rôle: owner")
        print("   Entreprise: Ma Boulangerie")
        print("   Accès: /app/* (gestion de son entreprise)")
        
        print("\n3. USER")
        print("   Email: user@example.com")
        print("   Password: user123")
        print("   Rôle: user")
        print("   Entreprise: Ma Boulangerie")
        print("   Accès: /app/* (employé)")
        print("="*50)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la création des utilisateurs: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    create_test_users()

