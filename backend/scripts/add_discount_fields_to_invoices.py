"""
Script pour ajouter les champs de réduction (discount) aux factures.
À exécuter une seule fois pour ajouter les colonnes discount_type, discount_value, discount_label à la table invoices.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_discount_fields_to_invoices():
    """Ajoute les colonnes de réduction à la table invoices."""
    db = SessionLocal()
    try:
        # Vérifier si les colonnes existent déjà
        if db.bind.dialect.name == 'sqlite':
            # Pour SQLite
            result = db.execute(text("PRAGMA table_info(invoices)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'discount_type' in columns:
                logger.info("Les colonnes de réduction existent déjà dans la table invoices")
                return
            
            # Ajouter les colonnes
            db.execute(text("ALTER TABLE invoices ADD COLUMN discount_type VARCHAR(20)"))
            db.execute(text("ALTER TABLE invoices ADD COLUMN discount_value NUMERIC(10, 2)"))
            db.execute(text("ALTER TABLE invoices ADD COLUMN discount_label VARCHAR(200)"))
            
        else:
            # Pour PostgreSQL
            # Vérifier si les colonnes existent déjà
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'invoices' 
                AND column_name IN ('discount_type', 'discount_value', 'discount_label')
            """)
            result = db.execute(check_query)
            existing_columns = [row[0] for row in result.fetchall()]
            
            if len(existing_columns) == 3:
                logger.info("Les colonnes de réduction existent déjà dans la table invoices")
                return
            
            # Ajouter les colonnes si elles n'existent pas
            if 'discount_type' not in existing_columns:
                db.execute(text("ALTER TABLE invoices ADD COLUMN discount_type VARCHAR(20)"))
                logger.info("Colonne discount_type ajoutée")
            
            if 'discount_value' not in existing_columns:
                db.execute(text("ALTER TABLE invoices ADD COLUMN discount_value NUMERIC(10, 2)"))
                logger.info("Colonne discount_value ajoutée")
            
            if 'discount_label' not in existing_columns:
                db.execute(text("ALTER TABLE invoices ADD COLUMN discount_label VARCHAR(200)"))
                logger.info("Colonne discount_label ajoutée")
        
        db.commit()
        logger.info("✅ Colonnes de réduction ajoutées avec succès à la table invoices")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur lors de l'ajout des colonnes de réduction: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_discount_fields_to_invoices()
