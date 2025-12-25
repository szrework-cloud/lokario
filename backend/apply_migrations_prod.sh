#!/bin/bash

# Script pour appliquer les migrations en production
# Usage: ./apply_migrations_prod.sh [DATABASE_URL]

set -e

echo "🚀 Application des migrations en production"
echo "=========================================="
echo ""

# Récupérer la DATABASE_URL depuis l'argument ou la variable d'environnement
if [ -z "$1" ]; then
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Erreur: DATABASE_URL non fournie"
        echo ""
        echo "Usage:"
        echo "  ./apply_migrations_prod.sh 'postgresql://user:pass@host:port/dbname'"
        echo "  OU"
        echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
        echo "  ./apply_migrations_prod.sh"
        echo ""
        exit 1
    else
        DB_URL="$DATABASE_URL"
    fi
else
    DB_URL="$1"
fi

# Export pour Alembic
export DATABASE_URL="$DB_URL"

echo "📊 État actuel des migrations:"
echo "-------------------------------"
alembic current || echo "⚠️  Aucune migration appliquée"

echo ""
echo "📋 Migrations disponibles:"
echo "--------------------------"
alembic heads

echo ""
echo "🔄 Application des migrations en attente..."
echo "-------------------------------------------"
alembic upgrade head

echo ""
echo "✅ Vérification finale:"
echo "----------------------"
alembic current

echo ""
echo "✅ Migrations appliquées avec succès!"

