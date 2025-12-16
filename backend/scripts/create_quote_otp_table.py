#!/usr/bin/env python3
"""
Script pour créer la table quote_otps pour stocker les codes OTP de validation.
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def create_otp_table():
    """Crée la table quote_otps."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la table existe déjà
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_otps'")
        if cursor.fetchone():
            print("✓ La table quote_otps existe déjà")
            return
        
        print("Création de la table quote_otps...")
        cursor.execute("""
            CREATE TABLE quote_otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id INTEGER NOT NULL,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at DATETIME NOT NULL,
                verified BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quote_id) REFERENCES quotes(id)
            )
        """)
        
        # Créer les index
        cursor.execute("CREATE INDEX idx_quote_otps_quote_id ON quote_otps(quote_id)")
        cursor.execute("CREATE INDEX idx_quote_otps_email ON quote_otps(email)")
        cursor.execute("CREATE INDEX idx_quote_otps_code ON quote_otps(code)")
        
        conn.commit()
        print("✅ Table quote_otps créée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Création de la table quote_otps\n")
    create_otp_table()
