#!/usr/bin/env python3
"""
Script pour ajouter les colonnes manquantes à la table quotes et créer la table quote_lines.
À exécuter si la migration Alembic ne fonctionne pas.
"""
import sqlite3
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

def main():
    # Extraire le chemin du fichier SQLite depuis DATABASE_URL
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    else:
        print(f"❌ DATABASE_URL non supporté: {db_url}")
        print("Ce script fonctionne uniquement avec SQLite.")
        sys.exit(1)
    
    # Convertir en Path pour gérer les chemins relatifs
    db_path = Path(db_path).resolve()
    
    if not db_path.exists():
        print(f"❌ Base de données non trouvée: {db_path}")
        sys.exit(1)
    
    print(f"📦 Connexion à la base de données: {db_path}")
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Obtenir la liste des colonnes existantes
        cursor.execute("PRAGMA table_info(quotes)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        
        print(f"📋 Colonnes existantes dans quotes: {', '.join(existing_columns)}")
        
        # Ajouter les colonnes manquantes
        columns_to_add = [
            ('conditions', 'TEXT'),
            ('subtotal_ht', 'NUMERIC(10, 2)'),
            ('total_tax', 'NUMERIC(10, 2)'),
            ('total_ttc', 'NUMERIC(10, 2)'),
        ]
        
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"➕ Ajout de la colonne {col_name}...")
                cursor.execute(f"ALTER TABLE quotes ADD COLUMN {col_name} {col_type}")
                print(f"✅ Colonne {col_name} ajoutée avec succès")
            else:
                print(f"⏭️  Colonne {col_name} existe déjà")
        
        # Vérifier si la table quote_lines existe
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='quote_lines'
        """)
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            print("➕ Création de la table quote_lines...")
            cursor.execute("""
                CREATE TABLE quote_lines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    quantity NUMERIC(10, 3) NOT NULL DEFAULT 1,
                    unit_price_ht NUMERIC(10, 2) NOT NULL,
                    tax_rate NUMERIC(5, 2) NOT NULL,
                    subtotal_ht NUMERIC(10, 2) NOT NULL,
                    tax_amount NUMERIC(10, 2) NOT NULL,
                    total_ttc NUMERIC(10, 2) NOT NULL,
                    "order" INTEGER NOT NULL,
                    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
                )
            """)
            
            # Créer l'index
            cursor.execute("""
                CREATE INDEX ix_quote_lines_quote_id ON quote_lines(quote_id)
            """)
            
            print("✅ Table quote_lines créée avec succès")
        else:
            print("⏭️  Table quote_lines existe déjà")
        
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except sqlite3.Error as e:
        print(f"\n❌ Erreur SQLite: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
