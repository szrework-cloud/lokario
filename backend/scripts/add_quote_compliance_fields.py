#!/usr/bin/env python3
"""
Script pour ajouter les champs de conformité légale aux devis.
Ajoute: valid_until, service_start_date, execution_duration
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def add_quote_compliance_fields():
    """Ajoute les champs de conformité aux devis."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si les colonnes existent déjà
        cursor.execute("PRAGMA table_info(quotes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Ajouter valid_until si n'existe pas
        if 'valid_until' not in columns:
            print("Ajout de la colonne valid_until...")
            cursor.execute("ALTER TABLE quotes ADD COLUMN valid_until DATETIME")
            print("✓ Colonne valid_until ajoutée")
        else:
            print("✓ Colonne valid_until existe déjà")
        
        # Ajouter service_start_date si n'existe pas
        if 'service_start_date' not in columns:
            print("Ajout de la colonne service_start_date...")
            cursor.execute("ALTER TABLE quotes ADD COLUMN service_start_date DATETIME")
            print("✓ Colonne service_start_date ajoutée")
        else:
            print("✓ Colonne service_start_date existe déjà")
        
        # Ajouter execution_duration si n'existe pas
        if 'execution_duration' not in columns:
            print("Ajout de la colonne execution_duration...")
            cursor.execute("ALTER TABLE quotes ADD COLUMN execution_duration VARCHAR(200)")
            print("✓ Colonne execution_duration ajoutée")
        else:
            print("✓ Colonne execution_duration existe déjà")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Ajout des champs de conformité aux devis\n")
    add_quote_compliance_fields()

