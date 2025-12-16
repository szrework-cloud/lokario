#!/usr/bin/env python3
"""
Script pour ajouter la colonne public_token à la table quotes.
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def add_public_token_column():
    """Ajoute la colonne public_token à la table quotes."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(quotes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'public_token' not in columns:
            print("Ajout de la colonne public_token...")
            cursor.execute("ALTER TABLE quotes ADD COLUMN public_token VARCHAR(64)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token)")
            print("✓ Colonne public_token ajoutée")
        else:
            print("✓ Colonne public_token existe déjà")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Ajout de public_token aux devis\n")
    add_public_token_column()
