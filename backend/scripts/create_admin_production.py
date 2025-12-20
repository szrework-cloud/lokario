#!/usr/bin/env python3
"""
Script pour créer/mettre à jour le compte admin en production.
Peut être exécuté directement sur Railway ou en local.
Usage: python3 scripts/create_admin_production.py
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_or_update_admin():
    """Crée ou met à jour le compte admin."""
    db = SessionLocal()
    try:
        email = "admin@lokario.fr"
        password = "Admin123!"
        
        logger.info(f"🔍 Recherche du compte admin: {email}")
        
        # Vérifier si l'utilisateur existe déjà
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Mettre à jour l'utilisateur existant
            logger.info(f"✅ Utilisateur {email} existe déjà. Mise à jour...")
            user.hashed_password = get_password_hash(password)
            user.role = "super_admin"
            user.is_active = True
            user.email_verified = True
            user.company_id = None  # super_admin n'a pas d'entreprise
            if not user.full_name:
                user.full_name = "Administrateur"
            db.commit()
            logger.info(f"✅ Compte admin mis à jour avec succès!")
            logger.info(f"   Email: {email}")
            logger.info(f"   Mot de passe: {password}")
            logger.info(f"   Rôle: super_admin")
            logger.info(f"   ID: {user.id}")
        else:
            # Créer un nouvel utilisateur
            logger.info(f"🆕 Création du compte admin...")
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
            logger.info(f"✅ Compte admin créé avec succès!")
            logger.info(f"   Email: {email}")
            logger.info(f"   Mot de passe: {password}")
            logger.info(f"   Rôle: super_admin")
            logger.info(f"   ID: {new_user.id}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_or_update_admin()
