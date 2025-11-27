"""
Script d'initialisation de la base de données.
Crée un super admin de test.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.user import User
from app.core.security import get_password_hash


def create_super_admin():
    """Crée un super admin de test."""
    # Initialiser la DB
    init_db()
    
    db = SessionLocal()
    try:
        # Vérifier si un super admin existe déjà
        existing_admin = db.query(User).filter(User.role == "super_admin").first()
        if existing_admin:
            print("Super admin already exists!")
            return
        
        # Créer le super admin
        password = "admin123"
        # Le mot de passe "admin123" fait 8 caractères, donc pas de problème avec bcrypt (limite 72 bytes)
        # On hash directement le mot de passe
        try:
            hashed = get_password_hash(password)
        except Exception as hash_error:
            print(f"❌ Erreur lors du hash du mot de passe: {hash_error}")
            # Essayer avec un mot de passe plus court si nécessaire
            if "longer than 72 bytes" in str(hash_error):
                password = password[:72]
                hashed = get_password_hash(password)
            else:
                raise
        
        super_admin = User(
            email="admin@localassistant.fr",
            hashed_password=hashed,
            full_name="Super Admin",
            role="super_admin",
            company_id=None,
            is_active=True
        )
        db.add(super_admin)
        db.commit()
        print("✅ Super admin created successfully!")
        print("   Email: admin@localassistant.fr")
        print("   Password: admin123")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating super admin: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_super_admin()

