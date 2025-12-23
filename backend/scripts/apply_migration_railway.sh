#!/bin/bash
# Script pour appliquer les migrations Alembic sur Railway
# Usage: Exécuter depuis Railway CLI ou via Railway Dashboard

set -e  # Arrêter en cas d'erreur

echo "🔄 Application des migrations Alembic sur Railway..."
echo ""

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas définie"
    echo ""
    echo "Ce script doit être exécuté dans un environnement où DATABASE_URL est définie"
    echo "(par exemple via Railway CLI ou Railway Dashboard)"
    exit 1
fi

# Aller dans le dossier backend
cd "$(dirname "$0")/.." || exit 1

echo "📦 Vérification de la connexion à la base de données..."
echo ""

# Tester la connexion
python3 << EOF
import sys
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("❌ DATABASE_URL n'est pas définie")
    sys.exit(1)

try:
    engine = create_engine(database_url, echo=False)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✅ Connexion réussie à PostgreSQL")
        print(f"   Version: {version.split(',')[0]}")
except Exception as e:
    print(f"❌ Erreur de connexion: {e}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Impossible de se connecter à la base de données"
    exit 1
fi

echo ""
echo "🔄 Exécution des migrations Alembic..."
echo ""

# Activer l'environnement virtuel si disponible
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Exécuter les migrations
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations appliquées avec succès !"
    echo ""
    echo "Vérification des colonnes ajoutées..."
    python3 << EOF
import os
from sqlalchemy import create_engine, text, inspect

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)
inspector = inspect(engine)

if 'clients' in inspector.get_table_names():
    columns = inspector.get_columns('clients')
    column_names = [col['name'] for col in columns]
    
    required_fields = ['city', 'postal_code', 'country', 'siret']
    all_present = all(field in column_names for field in required_fields)
    
    if all_present:
        print("✅ Toutes les colonnes sont présentes:")
        for field in required_fields:
            print(f"   - {field}")
    else:
        print("❌ Certaines colonnes sont manquantes:")
        for field in required_fields:
            if field in column_names:
                print(f"   ✅ {field}")
            else:
                print(f"   ❌ {field} - MANQUANT")
else:
    print("❌ La table 'clients' n'existe pas")
EOF
else
    echo ""
    echo "❌ Erreur lors de l'exécution des migrations"
    exit 1
fi

