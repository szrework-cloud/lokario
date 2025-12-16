#!/usr/bin/env python3
"""Script pour ajouter les colonnes manquantes à la table followups"""
import sqlite3
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

def check_and_add_columns():
    """Vérifie et ajoute les colonnes manquantes"""
    # Extraire le chemin de la base de données depuis DATABASE_URL
    # Format: sqlite:///path/to/database.db
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    else:
        print(f"❌ URL de base de données non supportée: {db_url}")
        return False
    
    if not Path(db_path).exists():
        print(f"❌ Base de données non trouvée: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Vérifier quelles colonnes existent
        cursor.execute("PRAGMA table_info(followups)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        
        print(f"📋 Colonnes existantes dans followups: {sorted(existing_columns)}")
        
        # Colonnes à ajouter
        columns_to_add = []
        
        if 'source_type' not in existing_columns:
            columns_to_add.append(('source_type', 'TEXT NOT NULL DEFAULT "manual"'))
        
        if 'source_id' not in existing_columns:
            columns_to_add.append(('source_id', 'INTEGER'))
        
        if 'source_label' not in existing_columns:
            columns_to_add.append(('source_label', 'TEXT NOT NULL DEFAULT ""'))
        
        if not columns_to_add:
            print("✅ Toutes les colonnes nécessaires existent déjà!")
            return True
        
        # Ajouter les colonnes manquantes
        for col_name, col_def in columns_to_add:
            try:
                # SQLite ne supporte pas ALTER TABLE ADD COLUMN avec DEFAULT pour NOT NULL
                # On doit d'abord ajouter la colonne, puis mettre à jour les valeurs
                if 'NOT NULL' in col_def and 'DEFAULT' in col_def:
                    # Extraire le DEFAULT
                    default_value = col_def.split('DEFAULT')[1].strip().strip('"')
                    # Ajouter la colonne sans NOT NULL d'abord
                    temp_def = col_def.replace(' NOT NULL', '')
                    cursor.execute(f"ALTER TABLE followups ADD COLUMN {col_name} {temp_def}")
                    # Mettre à jour les valeurs NULL
                    cursor.execute(f"UPDATE followups SET {col_name} = ? WHERE {col_name} IS NULL", (default_value,))
                    # SQLite ne permet pas de modifier une colonne pour ajouter NOT NULL après coup
                    # On laisse comme ça, ce n'est pas critique
                else:
                    cursor.execute(f"ALTER TABLE followups ADD COLUMN {col_name} {col_def}")
                print(f"✅ Colonne {col_name} ajoutée")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"⚠️  Colonne {col_name} existe déjà")
                else:
                    print(f"❌ Erreur lors de l'ajout de {col_name}: {e}")
                    raise
        
        conn.commit()
        print("✅ Migration terminée avec succès!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = check_and_add_columns()
    sys.exit(0 if success else 1)


