#!/bin/bash

# Script pour synchroniser le schéma de staging vers production en utilisant Alembic
# ⚠️ ATTENTION: Va supprimer toutes les données de production !

set -e

PROD_DB_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

echo "=========================================="
echo "📋 SYNCHRONISATION DU SCHÉMA VIA ALEMBIC"
echo "=========================================="
echo ""
echo "📌 Cette opération va:"
echo "   ✅ Réinitialiser toutes les migrations en production"
echo "   ✅ Supprimer toutes les données existantes"
echo "   ✅ Appliquer toutes les migrations depuis le début"
echo "   ✅ Synchroniser avec le schéma de staging"
echo ""
echo "⚠️  ATTENTION: Toutes les données de production seront supprimées !"
echo ""

# Demander confirmation
read -p "Voulez-vous continuer ? (oui/non): " confirmation
if [ "$confirmation" != "oui" ]; then
    echo "❌ Opération annulée"
    exit 1
fi

# Aller dans le répertoire backend
cd "$(dirname "$0")/.."

# Exporter la DATABASE_URL
export DATABASE_URL="$PROD_DB_URL"

echo ""
echo "=========================================="
echo "🔍 Étape 1: Vérification de l'état actuel"
echo "=========================================="
alembic current

echo ""
echo "=========================================="
echo "📤 Étape 2: Suppression de toutes les migrations"
echo "=========================================="

# Dernière confirmation
read -p "⚠️  DERNIÈRE CONFIRMATION: Tapez 'CONFIRMER' pour continuer: " final_confirmation
if [ "$final_confirmation" != "CONFIRMER" ]; then
    echo "❌ Opération annulée"
    exit 1
fi

# Supprimer toutes les tables et la table alembic_version
echo "🔄 Suppression de toutes les tables..."
psql "$PROD_DB_URL" << 'EOF'
-- Supprimer toutes les tables (y compris alembic_version)
SET session_replication_role = 'replica';

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Supprimer toutes les tables sauf alembic_version d'abord
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'alembic_version') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Supprimer la table alembic_version
DROP TABLE IF EXISTS alembic_version CASCADE;

SET session_replication_role = 'origin';
EOF

echo ""
echo "=========================================="
echo "📥 Étape 3: Application de toutes les migrations"
echo "=========================================="

# Appliquer toutes les migrations
echo "🔄 Application de toutes les migrations depuis le début..."
alembic upgrade head

echo ""
echo "=========================================="
echo "✅ SYNCHRONISATION TERMINÉE"
echo "=========================================="
echo ""
echo "🔍 Vérification de l'état final:"
alembic current
echo ""
echo "✅ Le schéma de production est maintenant synchronisé avec staging"
echo "⚠️  La base de données est vide (sans données)"

