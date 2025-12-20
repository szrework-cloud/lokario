#!/usr/bin/env python3
"""
Script pour créer ou mettre à jour le compte admin.
Usage: python scripts/create_admin.py
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash

def create_or_update_admin():
    """Crée ou met à jour le compte admin."""
    db = SessionLocal()
    try:
        email = "admin@lokario.fr"
        password = "Admin123!"
        
        # Vérifier si l'utilisateur existe déjà
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Mettre à jour l'utilisateur existant
            print(f"✅ Utilisateur {email} existe déjà. Mise à jour...")
            user.hashed_password = get_password_hash(password)
            user.role = "super_admin"
            user.is_active = True
            user.email_verified = True
            user.company_id = None  # super_admin n'a pas d'entreprise
            if not user.full_name:
                user.full_name = "Administrateur"
            db.commit()
            print(f"✅ Compte admin mis à jour avec succès!")
            print(f"   Email: {email}")
            print(f"   Mot de passe: {password}")
            print(f"   Rôle: super_admin")
        else:
            # Créer un nouvel utilisateur
            print(f"🆕 Création du compte admin...")
            new_user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="Administrateur",
                role="super_admin",
                company_id=None,  # super_admin n'a pas d'entreprise
                is_active=True,
                email_verified=True,
                can_edit_tasks=True,
                can_delete_tasks=True,
                can_create_tasks=True,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print(f"✅ Compte admin créé avec succès!")
            print(f"   Email: {email}")
            print(f"   Mot de passe: {password}")
            print(f"   Rôle: super_admin")
            print(f"   ID: {new_user.id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_or_update_admin()
