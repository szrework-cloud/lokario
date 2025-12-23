#!/usr/bin/env python3
"""
Script pour vérifier et corriger la contrainte unique sur quotes.number.

Ce script vérifie si la contrainte globale ix_quotes_number existe encore
et applique la migration pour la remplacer par une contrainte composite (company_id, number).
"""

import sys
import os

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def check_constraints(engine):
    """Vérifie l'état des contraintes sur la table quotes"""
    inspector = inspect(engine)
    
    print("🔍 Vérification des contraintes sur la table 'quotes'...\n")
    
    # Vérifier les index
    indexes = inspector.get_indexes('quotes')
    global_index_exists = False
    for idx in indexes:
        if idx['name'] == 'ix_quotes_number':
            global_index_exists = True
            print(f"❌ Contrainte globale trouvée: {idx['name']}")
            print(f"   Colonnes: {idx['column_names']}")
            print(f"   Unique: {idx.get('unique', False)}")
    
    # Vérifier les contraintes uniques
    constraints = inspector.get_unique_constraints('quotes')
    composite_exists = False
    for constraint in constraints:
        if constraint['name'] == 'uq_quotes_company_number':
            composite_exists = True
            print(f"✅ Contrainte composite trouvée: {constraint['name']}")
            print(f"   Colonnes: {constraint['column_names']}")
        elif 'company_id' in constraint['column_names'] and 'number' in constraint['column_names']:
            composite_exists = True
            print(f"✅ Contrainte composite trouvée: {constraint['name']}")
            print(f"   Colonnes: {constraint['column_names']}")
    
    print()
    return global_index_exists, composite_exists

def apply_migration(engine):
    """Applique la migration pour corriger la contrainte"""
    print("🔄 Application de la migration...\n")
    
    with engine.connect() as conn:
        # Commencer une transaction
        trans = conn.begin()
        
        try:
            # Vérifier si l'index global existe
            check_index = text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'quotes' 
                AND indexname = 'ix_quotes_number'
            """)
            result = conn.execute(check_index)
            index_exists = result.fetchone() is not None
            
            if index_exists:
                print("   Suppression de l'index global ix_quotes_number...")
                drop_index = text("DROP INDEX IF EXISTS ix_quotes_number")
                conn.execute(drop_index)
                print("   ✅ Index global supprimé")
            
            # Vérifier si la contrainte composite existe
            check_constraint = text("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'quotes' 
                AND constraint_name = 'uq_quotes_company_number'
            """)
            result = conn.execute(check_constraint)
            constraint_exists = result.fetchone() is not None
            
            if not constraint_exists:
                print("   Création de la contrainte composite (company_id, number)...")
                create_constraint = text("""
                    ALTER TABLE quotes 
                    ADD CONSTRAINT uq_quotes_company_number 
                    UNIQUE (company_id, number)
                """)
                conn.execute(create_constraint)
                print("   ✅ Contrainte composite créée")
            else:
                print("   ⏭️  Contrainte composite existe déjà")
            
            # Commit la transaction
            trans.commit()
            print("\n✅ Migration appliquée avec succès !\n")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Erreur lors de l'application de la migration: {e}\n")
            return False

def main():
    print("=" * 60)
    print("Vérification et correction de la contrainte quotes.number")
    print("=" * 60)
    print()
    
    # Créer la connexion
    try:
        engine = create_engine(settings.DATABASE_URL)
        print(f"✅ Connexion à la base de données réussie\n")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        sys.exit(1)
    
    # Vérifier l'état actuel
    global_exists, composite_exists = check_constraints(engine)
    
    # Déterminer l'action à prendre
    if global_exists and not composite_exists:
        print("⚠️  La contrainte globale existe encore, mais la contrainte composite n'existe pas.")
        print("   La migration doit être appliquée.\n")
        
        response = input("Voulez-vous appliquer la migration maintenant ? (o/n): ")
        if response.lower() in ['o', 'oui', 'y', 'yes']:
            if apply_migration(engine):
                print("✅ Migration appliquée avec succès !")
                print("   Vous pouvez maintenant créer des devis sans conflit.")
            else:
                print("❌ Échec de la migration. Vérifiez les logs ci-dessus.")
                sys.exit(1)
        else:
            print("⏭️  Migration annulée. Vous pouvez l'appliquer plus tard avec:")
            print("   alembic upgrade head")
    elif global_exists and composite_exists:
        print("⚠️  Les deux contraintes existent (globale et composite).")
        print("   La contrainte globale doit être supprimée.\n")
        
        response = input("Voulez-vous supprimer la contrainte globale ? (o/n): ")
        if response.lower() in ['o', 'oui', 'y', 'yes']:
            with engine.connect() as conn:
                trans = conn.begin()
                try:
                    drop_index = text("DROP INDEX IF EXISTS ix_quotes_number")
                    conn.execute(drop_index)
                    trans.commit()
                    print("✅ Contrainte globale supprimée !")
                except Exception as e:
                    trans.rollback()
                    print(f"❌ Erreur: {e}")
                    sys.exit(1)
    elif not global_exists and composite_exists:
        print("✅ État correct: seule la contrainte composite existe.")
        print("   Aucune action nécessaire.")
    else:
        print("⚠️  Aucune contrainte trouvée. Cela peut indiquer un problème.")
        print("   Vérifiez que la table 'quotes' existe et a les bonnes colonnes.")

if __name__ == "__main__":
    main()

