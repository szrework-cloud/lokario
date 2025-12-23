#!/usr/bin/env python3
"""
Script pour vérifier que la migration des champs client a été appliquée correctement.
Vérifie que les colonnes city, postal_code, country, siret existent dans la table clients.

Usage:
    cd backend
    source venv/bin/activate  # Activer l'environnement virtuel
    python3 scripts/verify_client_migration.py
"""

import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Changer le répertoire de travail vers backend pour que les imports fonctionnent
os.chdir(backend_dir)

from sqlalchemy import inspect
from app.db.session import engine

def verify_migration():
    """Vérifie que les colonnes ont été ajoutées à la table clients"""
    print("🔍 Vérification de la migration des champs client...\n")
    
    inspector = inspect(engine)
    
    # Vérifier que la table clients existe
    if 'clients' not in inspector.get_table_names():
        print("❌ ERREUR: La table 'clients' n'existe pas!")
        return False
    
    print("✅ La table 'clients' existe\n")
    
    # Récupérer les colonnes de la table clients
    columns = inspector.get_columns('clients')
    column_names = [col['name'] for col in columns]
    
    print(f"📋 Colonnes actuelles dans la table 'clients':")
    for col in columns:
        nullable = "NULL" if col['nullable'] else "NOT NULL"
        print(f"   - {col['name']} ({col['type']}) {nullable}")
    
    print("\n🔎 Vérification des nouveaux champs...\n")
    
    # Vérifier chaque nouveau champ
    required_fields = {
        'city': 'Ville',
        'postal_code': 'Code postal',
        'country': 'Pays',
        'siret': 'SIRET'
    }
    
    all_present = True
    for field_name, field_label in required_fields.items():
        if field_name in column_names:
            print(f"✅ {field_label} ({field_name}): Présent")
        else:
            print(f"❌ {field_label} ({field_name}): MANQUANT!")
            all_present = False
    
    print("\n" + "="*50)
    if all_present:
        print("✅ SUCCÈS: Tous les champs ont été ajoutés correctement!")
        return True
    else:
        print("❌ ÉCHEC: Certains champs sont manquants!")
        return False

if __name__ == "__main__":
    try:
        success = verify_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERREUR lors de la vérification: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

