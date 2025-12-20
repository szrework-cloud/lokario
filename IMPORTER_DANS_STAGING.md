# Importer le Schéma dans Staging

## ⚠️ IMPORTANT

**Vous avez essayé d'importer dans la base de données PRODUCTION !**

Il faut utiliser l'URL de **STAGING**, pas de production.

## ✅ Étapes Correctes

### 1. Créer le projet staging sur Supabase
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Créez un nouveau projet : `lokario-staging`
3. **Notez la nouvelle DATABASE_URL de staging** (différente de production)

### 2. Exporter uniquement le schéma public (vos tables)

Le fichier `schema_public_only.sql` contient uniquement vos tables (schéma `public`), sans les schémas Supabase (`auth`, `storage`, etc.).

### 3. Importer dans STAGING (pas production !)

```bash
# ⚠️ UTILISEZ L'URL DE STAGING, PAS DE PRODUCTION !
/opt/homebrew/opt/postgresql@17/bin/psql "postgresql://postgres.xxx:password@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" \
  -f schema_public_only.sql
```

**Remplacez :**
- `xxx` par le project_ref de staging
- `password` par le mot de passe de staging
- `aws-1-eu-west-1` par la région de staging

## 🔍 Vérifier les Tables

Après import, vérifiez dans Supabase Dashboard → Table Editor que toutes vos tables sont présentes :
- users
- companies
- clients
- tasks
- followups
- etc.

## 🆘 Si des Erreurs "already exists"

Si vous voyez des erreurs "relation already exists", c'est normal si vous avez déjà des tables. Vous pouvez :

1. **Ignorer les erreurs** - Les tables existent déjà, c'est OK
2. **Ou supprimer et recréer** (ATTENTION : supprime toutes les données) :
```sql
-- Dans Supabase SQL Editor de staging
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Puis réimporter :
```bash
/opt/homebrew/opt/postgresql@17/bin/psql "URL_STAGING" -f schema_public_only.sql
```
