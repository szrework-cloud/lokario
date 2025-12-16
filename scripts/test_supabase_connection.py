#!/usr/bin/env python3
"""
Script pour tester la connexion à Supabase PostgreSQL.
Utilise la connection string fournie pour vérifier que tout fonctionne.
"""
import os
import sys
from sqlalchemy import create_engine, text

def test_connection(database_url: str):
    """Teste la connexion à la base de données."""
    try:
        print(f"🔗 Tentative de connexion à Supabase...")
        print(f"   URL: {database_url.split('@')[0]}@[HIDDEN]")
        
        # Créer l'engine SQLAlchemy
        engine = create_engine(database_url, echo=False)
        
        # Tester la connexion
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Connexion réussie !")
            print(f"   PostgreSQL version: {version.split(',')[0]}")
            return True
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

if __name__ == "__main__":
    # Récupérer la connection string depuis les arguments ou l'environnement
    if len(sys.argv) > 1:
        database_url = sys.argv[1]
    elif os.getenv("DATABASE_URL"):
        database_url = os.getenv("DATABASE_URL")
    else:
        print("❌ Usage: python test_supabase_connection.py 'postgresql://...'")
        print("   Ou définir DATABASE_URL dans l'environnement")
        sys.exit(1)
    
    success = test_connection(database_url)
    sys.exit(0 if success else 1)

