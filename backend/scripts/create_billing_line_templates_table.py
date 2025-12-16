#!/usr/bin/env python3
"""
Script pour créer la table billing_line_templates.
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
        
        # Vérifier si la table existe
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='billing_line_templates'
        """)
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            print("➕ Création de la table billing_line_templates...")
            cursor.execute("""
                CREATE TABLE billing_line_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    unit_price_ht NUMERIC(10, 2) NOT NULL,
                    tax_rate NUMERIC(5, 2) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                )
            """)
            
            # Créer les index
            cursor.execute("""
                CREATE INDEX ix_billing_line_templates_id ON billing_line_templates(id)
            """)
            cursor.execute("""
                CREATE INDEX ix_billing_line_templates_company_id ON billing_line_templates(company_id)
            """)
            
            print("✅ Table billing_line_templates créée avec succès")
        else:
            print("⏭️  Table billing_line_templates existe déjà")
        
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

