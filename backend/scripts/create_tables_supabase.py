#!/usr/bin/env python3
"""
Script pour créer toutes les tables directement dans Supabase.
Utilise SQLAlchemy pour créer les tables à partir des modèles.
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from app.db.base import Base
from app.db.models import *  # noqa: F401, F403 - Import tous les modèles

def create_all_tables(database_url: str):
    """Crée toutes les tables dans la base de données."""
    try:
        print(f"🔗 Connexion à Supabase...")
        
        # Créer l'engine SQLAlchemy
        engine = create_engine(database_url, echo=False)
        
        print(f"📦 Création de toutes les tables...")
        
        # Créer toutes les tables
        Base.metadata.create_all(bind=engine)
        
        print(f"✅ Toutes les tables ont été créées avec succès !")
        
        # Lister les tables créées
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n📊 Tables créées ({len(tables)}):")
        for table in sorted(tables):
            print(f"   - {table}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Récupérer la connection string depuis les arguments ou l'environnement
    if len(sys.argv) > 1:
        database_url = sys.argv[1]
    elif os.getenv("DATABASE_URL"):
        database_url = os.getenv("DATABASE_URL")
    else:
        print("❌ Usage: python create_tables_supabase.py 'postgresql://...'")
        print("   Ou définir DATABASE_URL dans l'environnement")
        sys.exit(1)
    
    success = create_all_tables(database_url)
    sys.exit(0 if success else 1)
