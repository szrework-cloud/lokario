#!/usr/bin/env python3
"""
Script pour ajouter les colonnes TVA et auto-entrepreneur à la table clients dans SQLite.
À exécuter après avoir ajouté les champs au modèle Client.
"""

import sqlite3
import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def get_db_path():
    """Récupère le chemin de la base de données SQLite."""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        # sqlite:///./app.db -> ./app.db
        path = db_url.replace("sqlite:///", "")
        # Résoudre le chemin relatif
        if path.startswith("./"):
            # Chemin relatif depuis le répertoire backend
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            path = os.path.join(backend_dir, path[2:])
        return os.path.abspath(path)
    else:
        raise ValueError(f"URL de base de données non supportée: {db_url}")

def column_exists(cursor, table_name, column_name):
    """Vérifie si une colonne existe dans une table SQLite."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def add_columns():
    """Ajoute les colonnes manquantes à la table clients."""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"❌ Erreur: La base de données n'existe pas: {db_path}")
        print("   Créez d'abord la base de données avec les migrations Alembic.")
        return False
    
    print(f"📂 Base de données: {db_path}")
    print("")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Vérifier et ajouter is_auto_entrepreneur
        if not column_exists(cursor, "clients", "is_auto_entrepreneur"):
            print("➕ Ajout de la colonne 'is_auto_entrepreneur'...")
            cursor.execute("""
                ALTER TABLE clients 
                ADD COLUMN is_auto_entrepreneur BOOLEAN NOT NULL DEFAULT 0
            """)
            print("   ✅ Colonne 'is_auto_entrepreneur' ajoutée")
        else:
            print("   ℹ️  Colonne 'is_auto_entrepreneur' existe déjà")
        
        # Vérifier et ajouter vat_exempt
        if not column_exists(cursor, "clients", "vat_exempt"):
            print("➕ Ajout de la colonne 'vat_exempt'...")
            cursor.execute("""
                ALTER TABLE clients 
                ADD COLUMN vat_exempt BOOLEAN NOT NULL DEFAULT 0
            """)
            print("   ✅ Colonne 'vat_exempt' ajoutée")
        else:
            print("   ℹ️  Colonne 'vat_exempt' existe déjà")
        
        # Vérifier et ajouter vat_exemption_reference
        if not column_exists(cursor, "clients", "vat_exemption_reference"):
            print("➕ Ajout de la colonne 'vat_exemption_reference'...")
            cursor.execute("""
                ALTER TABLE clients 
                ADD COLUMN vat_exemption_reference VARCHAR(100)
            """)
            print("   ✅ Colonne 'vat_exemption_reference' ajoutée")
        else:
            print("   ℹ️  Colonne 'vat_exemption_reference' existe déjà")
        
        conn.commit()
        print("")
        print("✅ Migration terminée avec succès !")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Ajout des colonnes TVA pour les clients")
    print("=" * 60)
    print("")
    
    success = add_columns()
    
    if success:
        print("")
        print("🎉 Vous pouvez maintenant redémarrer le backend.")
        sys.exit(0)
    else:
        print("")
        print("❌ La migration a échoué. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)
