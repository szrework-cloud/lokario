#!/usr/bin/env python3
"""
Script pour créer un compte admin en staging.
À exécuter localement avec accès à la base de données staging.
"""

import sys
import os
from getpass import getpass

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash
from app.core.config import settings
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User
from datetime import datetime, timezone

def create_admin_user():
    """Crée un utilisateur admin dans la base de données staging."""
    db: Session = SessionLocal()
    
    try:
        print("🔐 Création d'un compte admin en staging")
        print("=" * 50)
        
        # Demander les informations
        email = input("Email de l'admin: ").strip()
        if not email:
            print("❌ Email requis")
            return
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ Un utilisateur avec l'email {email} existe déjà")
            response = input("Voulez-vous le mettre à jour? (o/n): ").strip().lower()
            if response != 'o':
                return
            user = existing_user
        else:
            user = User()
            user.email = email
        
        # Demander le mot de passe
        password = getpass("Mot de passe: ")
        if not password:
            print("❌ Mot de passe requis")
            return
        
        password_confirm = getpass("Confirmer le mot de passe: ")
        if password != password_confirm:
            print("❌ Les mots de passe ne correspondent pas")
            return
        
        # Demander le nom complet
        full_name = input("Nom complet (optionnel): ").strip() or None
        
        # Hash le mot de passe
        user.hashed_password = get_password_hash(password)
        user.full_name = full_name
        user.role = "super_admin"
        user.company_id = None  # Super admin n'a pas de company
        user.is_active = True
        user.email_verified = True  # Admin vérifié par défaut
        user.created_at = datetime.now(timezone.utc)
        
        if not existing_user:
            db.add(user)
        
        db.commit()
        db.refresh(user)
        
        print("\n✅ Compte admin créé avec succès!")
        print(f"   Email: {user.email}")
        print(f"   Nom: {user.full_name or 'N/A'}")
        print(f"   Rôle: {user.role}")
        print(f"   ID: {user.id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la création: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

