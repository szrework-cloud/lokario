#!/usr/bin/env python3
"""
Script simple pour vérifier si la migration de la contrainte quotes.number est appliquée.
Peut être exécuté depuis la racine du projet.
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
            
            # Afficher les résultats
            print("📊 Résultats:")
            print(f"   Contrainte globale 'ix_quotes_number': {'❌ EXISTE ENCORE' if global_index else '✅ N\'EXISTE PAS'}")
            print(f"   Contrainte composite 'uq_quotes_company_number': {'✅ EXISTE' if composite_constraint else '❌ N\'EXISTE PAS'}")
            print()
            
            # Conclusion
            if global_index and not composite_constraint:
                print("❌ PROBLÈME: La migration n'a PAS été appliquée")
                print("   → Exécutez: alembic upgrade head")
                return 1
            elif global_index and composite_constraint:
                print("⚠️  ATTENTION: Les deux contraintes existent")
                print("   → Supprimez la contrainte globale manuellement")
                return 1
            elif not global_index and composite_constraint:
                print("✅ TOUT EST BON: La migration est appliquée correctement")
                return 0
            else:
                print("⚠️  ÉTAT INCONNU: Aucune contrainte trouvée")
                return 1
                
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

