#!/usr/bin/env python3
"""
Script CLI simple pour vérifier l'état de la migration quotes.number.
Peut être exécuté localement ou sur Railway.
"""

import sys
import os

# Ajouter le backend au path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_dir)

# Changer vers le répertoire backend
os.chdir(backend_dir)

from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    print("🔍 Vérification de la migration quotes.number...\n")
    
    try:
        # Afficher quelle base de données est utilisée
        db_url = settings.DATABASE_URL
        if 'sqlite' in db_url.lower():
            print("⚠️  ATTENTION: Vous utilisez SQLite (base de données locale)")
            print("   Pour vérifier la base de données Railway, exécutez ce script sur Railway\n")
        elif 'postgresql' in db_url.lower() or 'postgres' in db_url.lower():
            print("✅ Connexion à PostgreSQL détectée\n")
        else:
            print(f"ℹ️  Type de base de données: {db_url.split('://')[0]}\n")
        
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # Vérifier si l'index global existe (ne devrait pas exister)
            result = conn.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'quotes' 
                AND indexname = 'ix_quotes_number'
            """))
            global_index = result.fetchone()
            
            # Vérifier si la contrainte composite existe (devrait exister)
            result = conn.execute(text("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'quotes' 
                AND constraint_name = 'uq_quotes_company_number'
            """))
            composite_constraint = result.fetchone()
            
            global_exists = global_index is not None
            composite_exists = composite_constraint is not None
            
            # Afficher les résultats
            print("📊 Résultats:")
            global_status = "❌ EXISTE ENCORE" if global_exists else "✅ N'EXISTE PAS"
            composite_status = "✅ EXISTE" if composite_exists else "❌ N'EXISTE PAS"
            print(f"   Contrainte globale 'ix_quotes_number': {global_status}")
            print(f"   Contrainte composite 'uq_quotes_company_number': {composite_status}")
            print()
            
            # Conclusion
            if global_exists and not composite_exists:
                print("❌ PROBLÈME: La migration n'a PAS été appliquée")
                print("   → Exécutez: alembic upgrade head")
                return 1
            elif global_exists and composite_exists:
                print("⚠️  ATTENTION: Les deux contraintes existent")
                print("   → Supprimez la contrainte globale manuellement")
                return 1
            elif not global_exists and composite_exists:
                print("✅ TOUT EST BON: La migration est appliquée correctement")
                return 0
            else:
                print("⚠️  ÉTAT INCONNU: Aucune contrainte trouvée")
                print("   → Vérifiez la structure de la table quotes")
                return 1
                
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

