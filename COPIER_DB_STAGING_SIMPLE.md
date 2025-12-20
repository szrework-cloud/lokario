# Copier DB vers Staging - Méthode Simple

## 🎯 Méthode la Plus Simple (Recommandée)

### Étape 1 : Créer le projet staging sur Supabase
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Créer un nouveau projet : `lokario-staging`
3. Notez la nouvelle `DATABASE_URL`

### Étape 2 : Utiliser pg_dump (le plus fiable)

#### Installer PostgreSQL client (si pas déjà installé)
```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client

# Windows (via WSL ou installer PostgreSQL)
```

#### Exporter depuis Production
```bash
# Remplacez par votre vraie DATABASE_URL de production
pg_dump "postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema_prod.sql
```

#### Importer dans Staging
```bash
# Remplacez par votre vraie DATABASE_URL de staging
psql "postgresql://postgres.yyy:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  -f schema_prod.sql
```

#### Nettoyer
```bash
rm schema_prod.sql
```

---

## 🔄 Alternative : Via Supabase Dashboard

Si vous ne pouvez pas utiliser pg_dump, voici comment faire manuellement :

### 1. Dans Production - Voir toutes les tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Pour chaque table, copier la structure

#### Dans Production :
1. Allez dans **Table Editor**
2. Cliquez sur une table (ex: `users`)
3. Cliquez sur "..." → "View Table Definition"
4. Copiez la structure SQL

#### Dans Staging :
1. Allez dans **SQL Editor**
2. Collez la structure SQL
3. Exécutez

**⚠️ Note :** Cette méthode est longue si vous avez beaucoup de tables. Utilisez `pg_dump` si possible.

---

## 📋 Exemple Complet avec Variables

```bash
# Définir les URLs (remplacez par vos vraies URLs)
export PROD_DB="postgresql://postgres.xxx:password@pooler.supabase.com:6543/postgres"
export STAGING_DB="postgresql://postgres.yyy:password@pooler.supabase.com:6543/postgres"

# Export
pg_dump "$PROD_DB" --schema-only --no-owner --no-acl -f schema.sql

# Import
psql "$STAGING_DB" -f schema.sql

# Nettoyer
rm schema.sql

echo "✅ Schéma copié avec succès !"
```

---

## ⚠️ Important

- **Copiez uniquement le schéma** (structure) pour staging
- **Ne copiez pas les données** de production (sécurité)
- Utilisez des données de test dans staging

---

## 🆘 Si pg_dump ne fonctionne pas

Vérifiez que vous utilisez le bon format d'URL :
- Pooler : port `6543`
- Direct : port `5432`

Exemple avec pooler (recommandé) :
```
postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```
