#!/usr/bin/env python3
"""
Script pour nettoyer la table followups en supprimant les colonnes inutilisées.
Alternative à la migration Alembic pour éviter les problèmes de chaîne de révisions.
"""
import sqlite3
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

def cleanup_followups_table():
    """Supprime les colonnes inutilisées de la table followups"""
    # Extraire le chemin du fichier SQLite depuis DATABASE_URL
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        # Si c'est un chemin relatif, le rendre absolu depuis le répertoire backend
        if not os.path.isabs(db_path):
            backend_dir = Path(__file__).resolve().parents[1]
            db_path = backend_dir / db_path
    else:
        print(f"❌ DATABASE_URL non supporté: {db_url}")
        return False
    
    if not os.path.exists(db_path):
        print(f"❌ Base de données non trouvée: {db_path}")
        return False
    
    print(f"📁 Base de données: {db_path}")
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Vérifier les colonnes actuelles
        cursor.execute("PRAGMA table_info(followups)")
        columns = {row[1]: row for row in cursor.fetchall()}
        
        print(f"\n📊 Colonnes actuelles dans followups: {len(columns)}")
        for col_name in columns.keys():
            print(f"   - {col_name}")
        
        # Colonnes à supprimer
        columns_to_remove = [
            'project_id',
            'quote_id', 
            'invoice_id',
            'message',
            'is_automatic',
            'delay_days',
            'sent_at'
        ]
        
        # Vérifier quelles colonnes existent vraiment
        existing_columns_to_remove = [col for col in columns_to_remove if col in columns]
        
        if not existing_columns_to_remove:
            print("\n✅ Aucune colonne à supprimer. La table est déjà propre.")
            conn.close()
            return True
        
        print(f"\n🗑️  Colonnes à supprimer: {existing_columns_to_remove}")
        
        # SQLite ne supporte pas DROP COLUMN directement, il faut recréer la table
        print("\n🔄 Création de la nouvelle table...")
        
        # 1. Créer la nouvelle table avec la structure correcte
        cursor.execute("""
            CREATE TABLE followups_new (
                id INTEGER PRIMARY KEY,
                company_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                type VARCHAR(17) NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'manual',
                source_id INTEGER,
                source_label TEXT NOT NULL DEFAULT '',
                due_date DATETIME NOT NULL,
                actual_date DATETIME,
                status VARCHAR(10) NOT NULL DEFAULT 'À faire',
                amount NUMERIC(10, 2),
                auto_enabled BOOLEAN NOT NULL DEFAULT 0,
                auto_frequency_days INTEGER,
                auto_stop_on_response BOOLEAN NOT NULL DEFAULT 1,
                auto_stop_on_paid BOOLEAN NOT NULL DEFAULT 1,
                auto_stop_on_refused BOOLEAN NOT NULL DEFAULT 1,
                created_by_id INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (client_id) REFERENCES clients(id),
                FOREIGN KEY (created_by_id) REFERENCES users(id)
            )
        """)
        
        # 2. Copier les données en mappant les anciennes colonnes
        print("📋 Copie des données...")
        cursor.execute("""
            INSERT INTO followups_new (
                id, company_id, client_id, type, source_type, source_id, source_label,
                due_date, actual_date, status, amount,
                auto_enabled, auto_frequency_days,
                auto_stop_on_response, auto_stop_on_paid, auto_stop_on_refused,
                created_by_id, created_at, updated_at
            )
            SELECT 
                id, company_id, client_id, type,
                COALESCE(source_type, 'manual') as source_type,
                source_id,
                COALESCE(source_label, '') as source_label,
                due_date, actual_date, status, amount,
                -- Mapper is_automatic vers auto_enabled
                COALESCE(is_automatic, 0) as auto_enabled,
                -- Mapper delay_days vers auto_frequency_days
                delay_days as auto_frequency_days,
                -- Valeurs par défaut pour auto_stop_*
                1 as auto_stop_on_response,
                1 as auto_stop_on_paid,
                1 as auto_stop_on_refused,
                NULL as created_by_id,
                created_at, updated_at
            FROM followups
        """)
        
        rows_copied = cursor.rowcount
        print(f"   ✅ {rows_copied} lignes copiées")
        
        # 3. Supprimer les index de l'ancienne table
        print("🗑️  Suppression des index...")
        indexes_to_drop = [
            'ix_followups_id',
            'ix_followups_company_id',
            'ix_followups_client_id',
            'ix_followups_type',
            'ix_followups_status',
            'ix_followups_due_date'
        ]
        
        for index_name in indexes_to_drop:
            try:
                cursor.execute(f"DROP INDEX IF EXISTS {index_name}")
            except:
                pass
        
        # 4. Supprimer l'ancienne table
        print("🗑️  Suppression de l'ancienne table...")
        cursor.execute("DROP TABLE followups")
        
        # 5. Renommer la nouvelle table
        print("🔄 Renommage de la nouvelle table...")
        cursor.execute("ALTER TABLE followups_new RENAME TO followups")
        
        # 6. Recréer les index
        print("📊 Recréation des index...")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_id ON followups(id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_company_id ON followups(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_client_id ON followups(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_type ON followups(type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_status ON followups(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_followups_due_date ON followups(due_date)")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Migration terminée avec succès!")
        print(f"   - Colonnes supprimées: {', '.join(existing_columns_to_remove)}")
        print(f"   - Données préservées: {rows_copied} lignes")
        return True
        
    except sqlite3.Error as e:
        print(f"\n❌ Erreur SQLite: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("🧹 Nettoyage de la table followups...\n")
    success = cleanup_followups_table()
    sys.exit(0 if success else 1)
