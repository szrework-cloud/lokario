#!/usr/bin/env python3
"""
Script pour créer un compte admin en staging.
Deux modes d'utilisation :
1. Mode interactif : exécutez le script et suivez les instructions
2. Mode génération SQL : génère un script SQL pour Supabase

Usage:
    python scripts/create_admin_staging.py                    # Mode interactif
    python scripts/create_admin_staging.py --sql              # Génère le SQL
    python scripts/create_admin_staging.py --hash PASSWORD    # Génère juste le hash
"""

import sys
import os
import argparse
from getpass import getpass

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash, validate_password_strength
from app.core.config import settings
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User
from datetime import datetime, timezone

def generate_hash(password: str) -> str:
    """Génère le hash bcrypt d'un mot de passe."""
    return get_password_hash(password)

def generate_sql(email: str, password: str, full_name: str = "Admin Lokario"):
    """Génère un script SQL pour créer l'admin."""
    password_hash = get_password_hash(password)
    
    sql = f"""-- Script SQL pour créer un compte admin en staging
-- À exécuter dans l'éditeur SQL de Supabase (staging)

DO $$
DECLARE
    admin_email TEXT := '{email}';
    admin_password_hash TEXT := '{password_hash}';
    admin_name TEXT := '{full_name}';
    existing_user_id INTEGER;
BEGIN
    -- Vérifier si l'utilisateur existe
    SELECT id INTO existing_user_id
    FROM users
    WHERE email = admin_email;
    
    IF existing_user_id IS NOT NULL THEN
        -- Mettre à jour l'utilisateur existant
        UPDATE users
        SET 
            hashed_password = admin_password_hash,
            full_name = admin_name,
            role = 'super_admin',
            company_id = NULL,
            is_active = TRUE,
            email_verified = TRUE,
            can_edit_tasks = TRUE,
            can_delete_tasks = TRUE,
            can_create_tasks = TRUE
        WHERE id = existing_user_id;
        
        RAISE NOTICE '✅ Utilisateur admin mis à jour (ID: %)', existing_user_id;
    ELSE
        -- Créer un nouvel utilisateur admin
        INSERT INTO users (
            email,
            hashed_password,
            full_name,
            role,
            company_id,
            is_active,
            email_verified,
            can_edit_tasks,
            can_delete_tasks,
            can_create_tasks,
            created_at
        ) VALUES (
            admin_email,
            admin_password_hash,
            admin_name,
            'super_admin',
            NULL,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            NOW()
        );
        
        RAISE NOTICE '✅ Compte admin créé avec succès !';
    END IF;
END $$;

-- Vérifier le résultat
SELECT 
    id,
    email,
    full_name,
    role,
    company_id,
    is_active,
    email_verified,
    created_at
FROM users
WHERE email = '{email}';
"""
    return sql

def create_admin_user_interactive():
    """Crée un utilisateur admin de manière interactive."""
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
            print(f"⚠️  Un utilisateur avec l'email {email} existe déjà")
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
        
        # Valider la force du mot de passe
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            print(f"❌ {error_msg}")
            return
        
        password_confirm = getpass("Confirmer le mot de passe: ")
        if password != password_confirm:
            print("❌ Les mots de passe ne correspondent pas")
            return
        
        # Demander le nom complet
        full_name = input("Nom complet (optionnel, défaut: 'Admin Lokario'): ").strip() or "Admin Lokario"
        
        # Hash le mot de passe
        user.hashed_password = get_password_hash(password)
        user.full_name = full_name
        user.role = "super_admin"
        user.company_id = None  # Super admin n'a pas de company
        user.is_active = True
        user.email_verified = True  # Admin vérifié par défaut
        user.can_edit_tasks = True
        user.can_delete_tasks = True
        user.can_create_tasks = True
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

def main():
    parser = argparse.ArgumentParser(description="Créer un compte admin en staging")
    parser.add_argument("--sql", action="store_true", help="Génère un script SQL au lieu de créer directement")
    parser.add_argument("--hash", type=str, help="Génère juste le hash d'un mot de passe")
    parser.add_argument("--email", type=str, help="Email de l'admin (pour mode SQL)")
    parser.add_argument("--password", type=str, help="Mot de passe (pour mode SQL)")
    parser.add_argument("--name", type=str, default="Admin Lokario", help="Nom complet (pour mode SQL)")
    
    args = parser.parse_args()
    
    if args.hash:
        # Mode génération de hash uniquement
        hash_value = generate_hash(args.hash)
        print(f"Hash bcrypt pour le mot de passe '{args.hash}':")
        print(hash_value)
        return
    
    if args.sql:
        # Mode génération SQL
        if not args.email or not args.password:
            print("❌ --email et --password sont requis en mode SQL")
            print("\nExemple:")
            print("  python scripts/create_admin_staging.py --sql --email admin@lokario.fr --password Admin123!")
            return
        
        # Valider la force du mot de passe
        is_valid, error_msg = validate_password_strength(args.password)
        if not is_valid:
            print(f"❌ {error_msg}")
            return
        
        sql = generate_sql(args.email, args.password, args.name)
        print(sql)
        print("\n💡 Copiez ce script SQL et exécutez-le dans l'éditeur SQL de Supabase (staging)")
        return
    
    # Mode interactif par défaut
    create_admin_user_interactive()

if __name__ == "__main__":
    main()
