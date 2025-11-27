"""
Script pour créer les settings par défaut pour les entreprises existantes qui n'en ont pas.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.core.defaults import get_default_settings


def backfill_company_settings():
    """Crée les settings par défaut pour les entreprises qui n'en ont pas."""
    init_db()
    
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        created_count = 0
        
        for company in companies:
            existing_settings = (
                db.query(CompanySettings)
                .filter(CompanySettings.company_id == company.id)
                .first()
            )
            
            if not existing_settings:
                settings = CompanySettings(
                    company_id=company.id,
                    settings=get_default_settings()
                )
                db.add(settings)
                created_count += 1
                print(f"✅ Settings créés pour: {company.name} (ID: {company.id})")
            else:
                print(f"ℹ️  Settings existent déjà pour: {company.name} (ID: {company.id})")
        
        db.commit()
        print(f"\n✅ {created_count} settings créés avec succès!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    backfill_company_settings()

