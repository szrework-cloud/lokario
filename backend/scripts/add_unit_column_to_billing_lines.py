#!/usr/bin/env python3
"""
Script pour ajouter la colonne 'unit' aux tables quote_lines, invoice_lines et billing_line_templates.
"""

import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal

def add_unit_column():
    """
    Ajoute la colonne 'unit' aux tables de lignes de facturation.
    """
    db = SessionLocal()
    
    try:
        print("🔄 Ajout de la colonne 'unit' aux tables...")
        
        # Ajouter la colonne à quote_lines
        try:
            db.execute(text("ALTER TABLE quote_lines ADD COLUMN unit VARCHAR(20)"))
            print("✅ Colonne 'unit' ajoutée à quote_lines")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  Colonne 'unit' existe déjà dans quote_lines")
            else:
                raise
        
        # Ajouter la colonne à invoice_lines
        try:
            db.execute(text("ALTER TABLE invoice_lines ADD COLUMN unit VARCHAR(20)"))
            print("✅ Colonne 'unit' ajoutée à invoice_lines")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  Colonne 'unit' existe déjà dans invoice_lines")
            else:
                raise
        
        # Ajouter la colonne à billing_line_templates
        try:
            db.execute(text("ALTER TABLE billing_line_templates ADD COLUMN unit VARCHAR(20)"))
            print("✅ Colonne 'unit' ajoutée à billing_line_templates")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  Colonne 'unit' existe déjà dans billing_line_templates")
            else:
                raise
        
        db.commit()
        print("\n✅ Migration terminée avec succès !")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la migration : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    add_unit_column()
