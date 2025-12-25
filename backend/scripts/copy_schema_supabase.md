# 📋 Solution Alternative: Copier le Schéma via Supabase Dashboard

Vu les problèmes de version avec `pg_dump`, voici une méthode alternative utilisant Supabase Dashboard.

---

## 🔧 Problème Identifié

- `pg_dump` version 14.20 est incompatible avec PostgreSQL 17.6
- Besoin de mettre à jour PostgreSQL client ou utiliser une méthode alternative

---

## ✅ Solution 1: Mettre à jour PostgreSQL Client

### Sur macOS (avec Homebrew):

```bash
brew upgrade postgresql
```

Ou installer PostgreSQL 17:

```bash
brew install postgresql@17
```

Puis utiliser la version mise à jour:

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_dump --version
```

---

## ✅ Solution 2: Utiliser Supabase Dashboard (Recommandé)

### Étape 1: Exporter le schéma depuis Staging

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner le projet **staging**
3. Aller dans **SQL Editor**
4. Exécuter cette requête pour obtenir le schéma:

```sql
-- Générer les CREATE TABLE statements
SELECT 
    'CREATE TABLE ' || quote_ident(table_name) || ' (' || 
    string_agg(
        quote_ident(column_name) || ' ' || 
        udt_name ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
        ORDER BY ordinal_position
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

5. Copier les résultats

### Étape 2: Importer dans Production

1. Aller dans le projet **production**
2. Aller dans **SQL Editor**
3. **SUPPRIMER toutes les tables existantes**:

```sql
-- Désactiver temporairement les contraintes
SET session_replication_role = 'replica';

-- Supprimer toutes les tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

SET session_replication_role = 'origin';
```

4. Copier-coller les CREATE TABLE statements de staging
5. Exécuter

---

## ✅ Solution 3: Utiliser Alembic pour synchroniser

Si vous avez des migrations Alembic à jour:

```bash
cd backend

# En production, réinitialiser et appliquer toutes les migrations
export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# Vérifier l'état actuel
alembic current

# Marquer comme étant à la base (si nécessaire)
alembic downgrade base

# Appliquer toutes les migrations depuis le début
alembic upgrade head
```

---

## ✅ Solution 4: Script SQL Direct

Exécuter ce script SQL directement dans Supabase Dashboard (production):

```sql
-- 1. Supprimer toutes les tables
SET session_replication_role = 'replica';

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

SET session_replication_role = 'origin';

-- 2. Ensuite, copier les CREATE TABLE depuis staging (via SQL Editor ou pg_dump depuis staging)
```

---

## 💡 Recommandation

**Utilisez Alembic** si vos migrations sont à jour - c'est la méthode la plus sûre et la plus maintenable.

