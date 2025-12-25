#!/bin/bash

# Script pour copier la base de données de staging vers production
# ⚠️ ATTENTION: Cette opération va écraser toutes les données de production !

set -e  # Arrêter en cas d'erreur

# URLs des bases de données
STAGING_DB_URL="postgresql://postgres.hobsxwtqnxrdrpmnuoga:ADEM-2006*gurler@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
PROD_DB_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# Répertoire pour les backups
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROD_BACKUP_FILE="${BACKUP_DIR}/prod_backup_${TIMESTAMP}.sql"

echo "=========================================="
echo "📋 COPIE DU SCHÉMA DE STAGING VERS PRODUCTION"
echo "=========================================="
echo ""
echo "📌 Cette opération va:"
echo "   ✅ Copier la structure des tables (schéma)"
echo "   ✅ Supprimer toutes les données existantes en production"
echo "   ✅ Laisser la base de données vide (sans données)"
echo ""
echo "⚠️  ATTENTION: Toutes les données de production seront supprimées !"
echo ""

# Créer le répertoire de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Demander confirmation
read -p "Voulez-vous continuer ? (oui/non): " confirmation
if [ "$confirmation" != "oui" ]; then
    echo "❌ Opération annulée"
    exit 1
fi

echo ""
echo "📦 Étape 1: Création d'un backup de production..."
echo "=========================================="

# Créer un backup de production (l'URL est déjà correctement encodée)
if pg_dump "$PROD_DB_URL" --clean --if-exists --schema-only > "$PROD_BACKUP_FILE" 2>&1; then
    echo "✅ Backup de production créé: $PROD_BACKUP_FILE"
else
    echo "⚠️  Erreur lors de la création du backup (peut être normal si la DB est vide)"
    echo "   Continuons quand même..."
fi

echo ""
echo "📥 Étape 2: Export du schéma de staging (sans données)..."
echo "=========================================="

# Fichier temporaire pour le dump de staging
STAGING_DUMP_FILE="${BACKUP_DIR}/staging_dump_${TIMESTAMP}.sql"

# Encoder le * dans le mot de passe de staging pour pg_dump
STAGING_DB_URL_ENCODED=$(echo "$STAGING_DB_URL" | sed 's/\*/%2A/g')

# Créer le dump de staging (SCHÉMA SEULEMENT, sans données)
if pg_dump "$STAGING_DB_URL_ENCODED" --clean --if-exists --schema-only > "$STAGING_DUMP_FILE" 2>&1; then
    echo "✅ Dump de staging créé: $STAGING_DUMP_FILE"
    DUMP_SIZE=$(du -h "$STAGING_DUMP_FILE" | cut -f1)
    echo "   Taille: $DUMP_SIZE"
else
    echo "❌ Erreur lors de la création du dump de staging"
    exit 1
fi

echo ""
echo "📤 Étape 3: Import du schéma dans production (base vide)..."
echo "=========================================="

# Demander une dernière confirmation
echo "⚠️  DERNIÈRE CONFIRMATION: Vous êtes sur le point d'écraser toutes les données de production !"
read -p "Tapez 'CONFIRMER' pour continuer: " final_confirmation
if [ "$final_confirmation" != "CONFIRMER" ]; then
    echo "❌ Opération annulée"
    exit 1
fi

# Importer le dump dans production (l'URL est déjà correctement encodée)
if psql "$PROD_DB_URL" < "$STAGING_DUMP_FILE" 2>&1; then
    echo "✅ Import réussi dans production"
else
    echo "❌ Erreur lors de l'import dans production"
    echo ""
    echo "💡 Pour restaurer le backup de production:"
    echo "   psql \"$PROD_DB_URL\" < \"$PROD_BACKUP_FILE\""
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ COPIE TERMINÉE AVEC SUCCÈS"
echo "=========================================="
echo ""
echo "📁 Fichiers créés:"
echo "   - Backup production: $PROD_BACKUP_FILE"
echo "   - Dump staging: $STAGING_DUMP_FILE"
echo ""
echo "⚠️  Note: Gardez le backup de production au cas où vous auriez besoin de restaurer"

