#!/usr/bin/env python3
"""
Script pour ajouter les champs de sécurité aux devis.
Ajoute: public_token_expires_at et signed_pdf_path dans QuoteSignature
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def add_security_fields():
    """Ajoute les champs de sécurité."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la colonne existe déjà dans quotes
        cursor.execute("PRAGMA table_info(quotes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'public_token_expires_at' not in columns:
            print("Ajout de la colonne public_token_expires_at à quotes...")
            cursor.execute("ALTER TABLE quotes ADD COLUMN public_token_expires_at DATETIME")
            print("✓ Colonne public_token_expires_at ajoutée")
        else:
            print("✓ Colonne public_token_expires_at existe déjà")
        
        # Vérifier si la colonne existe déjà dans quote_signatures
        cursor.execute("PRAGMA table_info(quote_signatures)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'signed_pdf_path' not in columns:
            print("Ajout de la colonne signed_pdf_path à quote_signatures...")
            cursor.execute("ALTER TABLE quote_signatures ADD COLUMN signed_pdf_path VARCHAR(500)")
            print("✓ Colonne signed_pdf_path ajoutée")
        else:
            print("✓ Colonne signed_pdf_path existe déjà")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Ajout des champs de sécurité\n")
    add_security_fields()
