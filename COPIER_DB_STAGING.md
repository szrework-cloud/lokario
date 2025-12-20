# Copier la Base de Données vers Staging

## 🎯 Objectif
Créer une base de données staging identique à la production pour tester.

## 📋 Méthode 1 : Via Supabase Dashboard (Simple)

### Étape 1 : Créer le projet staging
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Cliquez sur "New Project"
3. Nom : `lokario-staging`
4. Région : même que production (recommandé)
5. Mot de passe : générez-en un nouveau
6. Notez la nouvelle `DATABASE_URL`

### Étape 2 : Copier le schéma via SQL Editor

#### Dans le projet PRODUCTION :
1. Allez dans **SQL Editor**
2. Exécutez cette requête pour voir toutes les tables :
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

#### Copier chaque table :
Pour chaque table, exécutez dans production :
```sql
-- Exemple pour la table users
SELECT 'CREATE TABLE ' || table_name || ' AS SELECT * FROM ' || table_name || ' WHERE 1=0;'
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Puis dans staging, créez les tables avec la même structure.

---

## 📋 Méthode 2 : Via pg_dump (Recommandé - Plus complet)

### Prérequis
Installer PostgreSQL client :
```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client
```

### Étape 1 : Exporter depuis production
```bash
# Exporter uniquement le schéma (structure)
pg_dump "postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema_prod.sql

# OU exporter schéma + données (attention : peut être volumineux)
pg_dump "postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  --no-owner \
  --no-acl \
  -f full_prod.sql
```

### Étape 2 : Importer dans staging
```bash
# Importer le schéma
psql "postgresql://postgres.yyy:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  -f schema_prod.sql

# OU importer schéma + données
psql "postgresql://postgres.yyy:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  -f full_prod.sql
```

---

## 📋 Méthode 3 : Via Supabase CLI (Avancé)

### Installation
```bash
npm install -g supabase
```

### Export depuis production
```bash
supabase db dump -f schema.sql --db-url "postgresql://..."
```

### Import dans staging
```bash
supabase db reset --db-url "postgresql://..." < schema.sql
```

---

## ⚠️ Recommandations

### Pour Staging :
- ✅ **Copier uniquement le schéma** (structure) au début
- ✅ Utiliser des données de test, pas les vraies données de production
- ✅ Réinitialiser régulièrement staging avec un schéma propre

### Pour Production :
- ❌ Ne jamais copier les données de production vers staging si elles contiennent des infos sensibles
- ✅ Utiliser des données anonymisées ou de test

---

## 🔄 Workflow Recommandé

1. **Première fois** : Copier uniquement le schéma
2. **Après migrations** : Réappliquer les migrations sur staging
3. **Pour tester** : Utiliser des données de test, pas les vraies données

---

## 🆘 En Cas de Problème

### Erreur de connexion
- Vérifiez que vous utilisez le bon port (6543 pour pooler, 5432 pour direct)
- Vérifiez les credentials

### Tables déjà existantes
```sql
-- Supprimer toutes les tables (ATTENTION : supprime tout !)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## 📝 Exemple Complet

```bash
# 1. Variables d'environnement
export PROD_DB="postgresql://postgres.xxx:pass@pooler.supabase.com:6543/postgres"
export STAGING_DB="postgresql://postgres.yyy:pass@pooler.supabase.com:6543/postgres"

# 2. Export
pg_dump "$PROD_DB" --schema-only --no-owner --no-acl -f schema.sql

# 3. Import
psql "$STAGING_DB" -f schema.sql

# 4. Nettoyer
rm schema.sql
```
