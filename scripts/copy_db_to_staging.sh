#!/bin/bash
# Script pour copier la base de données de production vers staging

# ⚠️ REMPLACEZ ces URLs par vos vraies URLs
PROD_DATABASE_URL="postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
STAGING_DATABASE_URL="postgresql://postgres.yyy:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

echo "📊 Copie de la base de données production → staging"
echo ""

# 1. Exporter le schéma (structure) depuis production
echo "1️⃣ Export du schéma depuis production..."
pg_dump "$PROD_DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema_prod.sql

# 2. Exporter les données (optionnel - décommentez si vous voulez copier les données)
# echo "2️⃣ Export des données depuis production..."
# pg_dump "$PROD_DATABASE_URL" \
#   --data-only \
#   --no-owner \
#   --no-acl \
#   -f data_prod.sql

# 3. Importer le schéma dans staging
echo "3️⃣ Import du schéma dans staging..."
psql "$STAGING_DATABASE_URL" -f schema_prod.sql

# 4. Importer les données (optionnel - décommentez si vous voulez copier les données)
# echo "4️⃣ Import des données dans staging..."
# psql "$STAGING_DATABASE_URL" -f data_prod.sql

echo ""
echo "✅ Copie terminée !"
echo "⚠️  N'oubliez pas de supprimer les fichiers schema_prod.sql et data_prod.sql après"
