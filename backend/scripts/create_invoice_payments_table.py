#!/usr/bin/env python3
"""
Script pour créer la table invoice_payments dans la base de données.
Permet de stocker les paiements d'une facture pour gérer les paiements partiels.
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def create_invoice_payments_table():
    """Crée la table invoice_payments."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la table existe déjà
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invoice_payments'")
        if cursor.fetchone():
            print("✓ La table invoice_payments existe déjà")
            return
        
        print("Création de la table invoice_payments...")
        cursor.execute("""
            CREATE TABLE invoice_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                payment_date DATETIME NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                reference VARCHAR(255),
                notes TEXT,
                created_by_id INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        conn.commit()
        
        # Créer les index séparément
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_by_id ON invoice_payments(created_by_id)")
        
        conn.commit()
        print("✅ Table invoice_payments créée avec succès!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur lors de la création de la table: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_invoice_payments_table()
