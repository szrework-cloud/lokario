#!/usr/bin/env python3
"""
Script de migration pour ajouter les champs de réduction/escompte aux devis.
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from sqlalchemy import text

def add_discount_fields():
    """Ajoute les champs discount_type, discount_value et discount_label à la table quotes."""
    db = SessionLocal()
    try:
        # Vérifier si les colonnes existent déjà
        result = db.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='quotes'
        """))
        if not result.fetchone():
            print("❌ La table 'quotes' n'existe pas.")
            return
        
        # Vérifier si les colonnes existent déjà
        result = db.execute(text("PRAGMA table_info(quotes)"))
        columns = [row[1] for row in result.fetchall()]
        
        if "discount_type" not in columns:
            print("Ajout de la colonne 'discount_type'...")
            db.execute(text("""
                ALTER TABLE quotes 
                ADD COLUMN discount_type VARCHAR(20)
            """))
            print("✅ Colonne 'discount_type' ajoutée.")
        else:
            print("ℹ️  La colonne 'discount_type' existe déjà.")
        
        if "discount_value" not in columns:
            print("Ajout de la colonne 'discount_value'...")
            db.execute(text("""
                ALTER TABLE quotes 
                ADD COLUMN discount_value NUMERIC(10, 2)
            """))
            print("✅ Colonne 'discount_value' ajoutée.")
        else:
            print("ℹ️  La colonne 'discount_value' existe déjà.")
        
        if "discount_label" not in columns:
            print("Ajout de la colonne 'discount_label'...")
            db.execute(text("""
                ALTER TABLE quotes 
                ADD COLUMN discount_label VARCHAR(200)
            """))
            print("✅ Colonne 'discount_label' ajoutée.")
        else:
            print("ℹ️  La colonne 'discount_label' existe déjà.")
        
        db.commit()
        print("\n✅ Migration terminée avec succès !")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Début de la migration pour ajouter les champs de réduction aux devis...\n")
    add_discount_fields()
