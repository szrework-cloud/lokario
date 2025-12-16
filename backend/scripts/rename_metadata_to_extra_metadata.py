#!/usr/bin/env python3
"""
Script pour renommer la colonne metadata en extra_metadata dans les tables de signature.
"""
import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent.parent / "app.db"

def rename_metadata_column():
    """Renomme metadata en extra_metadata."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la colonne metadata existe dans quote_signatures
        cursor.execute("PRAGMA table_info(quote_signatures)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'metadata' in columns and 'extra_metadata' not in columns:
            print("Renommage de metadata en extra_metadata dans quote_signatures...")
            # SQLite ne supporte pas ALTER TABLE RENAME COLUMN directement
            # Il faut recréer la table
            cursor.execute("""
                CREATE TABLE quote_signatures_new (
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
            cursor.execute("""
                INSERT INTO quote_signatures_new 
                SELECT id, quote_id, signer_email, signer_name, signature_hash, 
                       document_hash_before_signature, signed_at, ip_address, 
                       user_agent, consent_given, consent_text, metadata, created_at
                FROM quote_signatures
            """)
            cursor.execute("DROP TABLE quote_signatures")
            cursor.execute("ALTER TABLE quote_signatures_new RENAME TO quote_signatures")
            cursor.execute("CREATE INDEX idx_quote_signatures_quote_id ON quote_signatures(quote_id)")
            print("✓ Colonne renommée dans quote_signatures")
        else:
            print("✓ Colonne extra_metadata existe déjà dans quote_signatures")
        
        # Vérifier si la colonne metadata existe dans quote_signature_audit_logs
        cursor.execute("PRAGMA table_info(quote_signature_audit_logs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'metadata' in columns and 'extra_metadata' not in columns:
            print("Renommage de metadata en extra_metadata dans quote_signature_audit_logs...")
            cursor.execute("""
                CREATE TABLE quote_signature_audit_logs_new (
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
            cursor.execute("""
                INSERT INTO quote_signature_audit_logs_new 
                SELECT id, quote_id, event_type, event_description, user_email, 
                       user_id, event_timestamp, ip_address, user_agent, metadata, created_at
                FROM quote_signature_audit_logs
            """)
            cursor.execute("DROP TABLE quote_signature_audit_logs")
            cursor.execute("ALTER TABLE quote_signature_audit_logs_new RENAME TO quote_signature_audit_logs")
            cursor.execute("CREATE INDEX idx_quote_signature_audit_logs_quote_id ON quote_signature_audit_logs(quote_id)")
            cursor.execute("CREATE INDEX idx_quote_signature_audit_logs_event_timestamp ON quote_signature_audit_logs(event_timestamp)")
            print("✓ Colonne renommée dans quote_signature_audit_logs")
        else:
            print("✓ Colonne extra_metadata existe déjà dans quote_signature_audit_logs")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("Migration: Renommage de metadata en extra_metadata\n")
    rename_metadata_column()
