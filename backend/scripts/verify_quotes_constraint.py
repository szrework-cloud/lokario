#!/usr/bin/env python3
"""
Script pour vérifier l'état de la contrainte unique sur quotes.number.

Ce script vérifie :
1. Si la migration fix_quotes_number_unique_constraint a été appliquée
2. L'état des contraintes (globale vs composite)
3. Si tout est correctement configuré
"""

import sys
import os

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def check_alembic_version(engine):
    """Vérifie la version Alembic actuelle"""
    print("🔍 Vérification de la version Alembic...")
    
    try:
        with engine.connect() as conn:
            # Vérifier si la table alembic_version existe
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                )
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                print("   ⚠️  Table alembic_version n'existe pas")
                return None
            
            # Récupérer la version actuelle
            result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
            row = result.fetchone()
            
            if row:
                version = row[0]
                print(f"   ✅ Version Alembic actuelle: {version}")
                return version
            else:
                print("   ⚠️  Aucune version enregistrée dans alembic_version")
                return None
                
    except Exception as e:
        print(f"   ❌ Erreur lors de la vérification: {e}")
        return None

def check_constraints(engine):
    """Vérifie l'état des contraintes sur la table quotes"""
    print("\n🔍 Vérification des contraintes sur la table 'quotes'...\n")
    
    inspector = inspect(engine)
    
    # Vérifier si la table existe
    if 'quotes' not in inspector.get_table_names():
        print("   ❌ La table 'quotes' n'existe pas !")
        return False, False
    
    # Vérifier les index
    indexes = inspector.get_indexes('quotes')
    global_index_exists = False
    for idx in indexes:
        if idx['name'] == 'ix_quotes_number':
            global_index_exists = True
            print(f"   ❌ Contrainte globale trouvée: {idx['name']}")
            print(f"      Colonnes: {idx['column_names']}")
            print(f"      Unique: {idx.get('unique', False)}")
    
    # Vérifier les contraintes uniques
    constraints = inspector.get_unique_constraints('quotes')
    composite_exists = False
    composite_name = None
    
    for constraint in constraints:
        if constraint['name'] == 'uq_quotes_company_number':
            composite_exists = True
            composite_name = constraint['name']
            print(f"   ✅ Contrainte composite trouvée: {constraint['name']}")
            print(f"      Colonnes: {constraint['column_names']}")
        elif len(constraint['column_names']) == 2 and 'company_id' in constraint['column_names'] and 'number' in constraint['column_names']:
            composite_exists = True
            composite_name = constraint['name']
            print(f"   ✅ Contrainte composite trouvée: {constraint['name']}")
            print(f"      Colonnes: {constraint['column_names']}")
    
    if not global_index_exists and not composite_exists:
        print("   ⚠️  Aucune contrainte unique trouvée sur quotes.number")
    
    return global_index_exists, composite_exists

def check_quotes_data(engine):
    """Vérifie les données existantes pour détecter d'éventuels conflits"""
    print("\n🔍 Vérification des données existantes...\n")
    
    try:
        with engine.connect() as conn:
            # Compter le nombre total de devis
            result = conn.execute(text("SELECT COUNT(*) FROM quotes"))
            total_quotes = result.scalar()
            print(f"   📊 Nombre total de devis: {total_quotes}")
            
            # Vérifier s'il y a des doublons de numéros entre différentes entreprises
            result = conn.execute(text("""
                SELECT number, COUNT(DISTINCT company_id) as company_count
                FROM quotes
                GROUP BY number
                HAVING COUNT(DISTINCT company_id) > 1
                LIMIT 10
            """))
            duplicates = result.fetchall()
            
            if duplicates:
                print(f"   ⚠️  {len(duplicates)} numéro(s) de devis utilisé(s) par plusieurs entreprises:")
                for row in duplicates:
                    print(f"      - {row[0]} utilisé par {row[1]} entreprise(s)")
                print("   💡 Cela est normal si la contrainte composite est active")
            else:
                print("   ✅ Aucun conflit détecté entre entreprises")
            
            # Vérifier les devis par entreprise
            result = conn.execute(text("""
                SELECT company_id, COUNT(*) as quote_count
                FROM quotes
                GROUP BY company_id
                ORDER BY quote_count DESC
                LIMIT 5
            """))
            companies = result.fetchall()
            
            if companies:
                print(f"\n   📊 Top 5 entreprises par nombre de devis:")
                for row in companies:
                    print(f"      - Company {row[0]}: {row[1]} devis")
                    
    except Exception as e:
        print(f"   ❌ Erreur lors de la vérification des données: {e}")

def main():
    print("=" * 70)
    print("Vérification de l'état de la contrainte quotes.number")
    print("=" * 70)
    print()
    
    # Créer la connexion
    try:
        engine = create_engine(settings.DATABASE_URL)
        print("✅ Connexion à la base de données réussie\n")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        sys.exit(1)
    
    # Vérifier la version Alembic
    alembic_version = check_alembic_version(engine)
    
    # Vérifier les contraintes
    global_exists, composite_exists = check_constraints(engine)
    
    # Vérifier les données
    check_quotes_data(engine)
    
    # Résumé
    print("\n" + "=" * 70)
    print("RÉSUMÉ")
    print("=" * 70)
    
    if global_exists and not composite_exists:
        print("❌ PROBLÈME DÉTECTÉ:")
        print("   - La contrainte globale 'ix_quotes_number' existe encore")
        print("   - La contrainte composite 'uq_quotes_company_number' n'existe pas")
        print("\n💡 ACTION REQUISE:")
        print("   Exécutez: alembic upgrade head")
        print("   Ou utilisez: python scripts/check_and_fix_quotes_constraint.py")
        return 1
    elif global_exists and composite_exists:
        print("⚠️  ÉTAT INTERMÉDIAIRE:")
        print("   - La contrainte globale 'ix_quotes_number' existe encore")
        print("   - La contrainte composite 'uq_quotes_company_number' existe aussi")
        print("\n💡 ACTION RECOMMANDÉE:")
        print("   Supprimez la contrainte globale pour éviter les conflits")
        print("   Exécutez: python scripts/check_and_fix_quotes_constraint.py")
        return 1
    elif not global_exists and composite_exists:
        print("✅ ÉTAT CORRECT:")
        print("   - La contrainte globale 'ix_quotes_number' n'existe plus")
        print("   - La contrainte composite 'uq_quotes_company_number' est active")
        print("\n✅ Tout est correctement configuré !")
        return 0
    else:
        print("⚠️  ÉTAT INCONNU:")
        print("   - Aucune contrainte unique trouvée sur quotes.number")
        print("\n💡 Vérifiez que la table 'quotes' existe et a les bonnes colonnes")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

