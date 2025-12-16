#!/usr/bin/env python3
"""
Script pour créer les tables de signature électronique sécurisée pour les devis.
Crée: quote_signatures et quote_signature_audit_logs
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def add_quote_signature_tables():
    """Crée les tables pour la signature électronique sécurisée."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si les tables existent déjà
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_signatures'")
        if cursor.fetchone():
            print("✓ Table quote_signatures existe déjà")
        else:
            print("Création de la table quote_signatures...")
            cursor.execute("""
                CREATE TABLE quote_signatures (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL UNIQUE,
                    signer_email VARCHAR(255) NOT NULL,
                    signer_name VARCHAR(255),
                    signature_hash VARCHAR(64) NOT NULL,
                    document_hash_before_signature VARCHAR(64) NOT NULL,
                    signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    consent_given BOOLEAN NOT NULL DEFAULT 1,
                    consent_text TEXT,
                    extra_metadata TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quote_id) REFERENCES quotes(id)
                )
            """)
            cursor.execute("CREATE INDEX idx_quote_signatures_quote_id ON quote_signatures(quote_id)")
            print("✓ Table quote_signatures créée")
        
        # Vérifier si la table audit existe déjà
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_signature_audit_logs'")
        if cursor.fetchone():
            print("✓ Table quote_signature_audit_logs existe déjà")
        else:
            print("Création de la table quote_signature_audit_logs...")
            cursor.execute("""
                CREATE TABLE quote_signature_audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    event_description TEXT,
                    user_email VARCHAR(255),
                    user_id INTEGER,
                    event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    extra_metadata TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quote_id) REFERENCES quotes(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            cursor.execute("CREATE INDEX idx_quote_signature_audit_logs_quote_id ON quote_signature_audit_logs(quote_id)")
            cursor.execute("CREATE INDEX idx_quote_signature_audit_logs_event_timestamp ON quote_signature_audit_logs(event_timestamp)")
            print("✓ Table quote_signature_audit_logs créée")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Création des tables de signature électronique sécurisée\n")
    add_quote_signature_tables()
