#!/usr/bin/env python3
"""
Script pour créer toutes les tables depuis les modèles SQLAlchemy
"""
import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine
from app.core.config import settings

# Importer tous les modèles pour qu'ils soient enregistrés
from app.db.models import user, company, client, task, project, conversation, invoice, quote  # noqa
from app.db.models import appointment, checklist, followup, notification  # noqa
from app.db.models import document, inbox, chatbot, subscription, billing  # noqa

def create_all_tables():
    """Crée toutes les tables depuis les modèles"""
    print("=" * 60)
    print("📋 CRÉATION DE TOUTES LES TABLES")
    print("=" * 60)
    print()
    
    # Utiliser la DATABASE_URL de production si fournie
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        from sqlalchemy import create_engine
        engine = create_engine(db_url)
        print(f"✅ Connexion à la base de données configurée")
    else:
        print("⚠️  DATABASE_URL non défini, utilisation de la configuration par défaut")
    
    print()
    print("🔄 Création de toutes les tables...")
    
    try:
        # Créer toutes les tables
        Base.metadata.create_all(bind=engine)
        print("✅ Toutes les tables ont été créées avec succès")
        
        # Lister les tables créées
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = sorted(inspector.get_table_names())
        print(f"\n📊 {len(tables)} tables créées:")
        for table in tables:
            print(f"   - {table}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = create_all_tables()
    sys.exit(0 if success else 1)

