#!/bin/bash
# Script pour exécuter les migrations Alembic sur Supabase

set -e  # Arrêter en cas d'erreur

echo "🚀 Exécution des migrations sur Supabase PostgreSQL"
echo ""

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas définie"
    echo ""
    echo "Usage:"
    echo "  export DATABASE_URL='postgresql://postgres:[PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres'"
    echo "  ./scripts/run_migrations_supabase.sh"
    echo ""
    exit 1
fi

# Aller dans le dossier backend
cd "$(dirname "$0")/../backend" || exit 1

echo "📦 Vérification de la connexion..."
echo ""

# Tester la connexion
python3 << EOF
import sys
from sqlalchemy import create_engine, text

try:
    engine = create_engine("$DATABASE_URL", echo=False)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✅ Connexion réussie à Supabase")
        print(f"   PostgreSQL: {version.split(',')[0]}")
except Exception as e:
    print(f"❌ Erreur de connexion: {e}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Impossible de se connecter à la base de données"
    echo "   Vérifiez votre DATABASE_URL"
    exit 1
fi

echo ""
echo "🔄 Exécution des migrations Alembic..."
echo ""

# Exécuter les migrations
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations exécutées avec succès !"
    echo ""
    echo "Votre base de données Supabase est maintenant prête."
else
    echo ""
    echo "❌ Erreur lors de l'exécution des migrations"
    exit 1
fi

