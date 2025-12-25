# 📋 Guide: Synchroniser le Schéma de Staging vers Production

## 🔍 Problème Identifié

- `pg_dump` version 14.20 est incompatible avec PostgreSQL 17.6
- Besoin d'une méthode alternative pour copier le schéma

## ✅ Solution Recommandée: Utiliser Alembic

**Avantages** :
- ✅ Pas de problème de version
- ✅ Utilise vos migrations existantes
- ✅ Méthode reproductible et maintenable
- ✅ Garantit la cohérence avec le code

---

## 🚀 Méthode Rapide: Script Automatique

```bash
cd backend
./scripts/sync_schema_staging_to_prod.sh
```

Ce script va :
1. Vérifier l'état actuel des migrations
2. Supprimer toutes les tables en production
3. Appliquer toutes les migrations depuis le début
4. Synchroniser avec le schéma de staging

---

## 📝 Méthode Manuelle avec Alembic

### Étape 1: Se connecter à la base de données production

```bash
cd backend
export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
```

### Étape 2: Vérifier l'état actuel

```bash
alembic current
```

### Étape 3: Supprimer toutes les tables

**Option A: Via Alembic** (si des migrations sont déjà appliquées):

```bash
alembic downgrade base
```

**Option B: Via SQL direct** (si Alembic échoue):

```bash
psql "$DATABASE_URL" << 'EOF'
SET session_replication_role = 'replica';

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'alembic_version') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

DROP TABLE IF EXISTS alembic_version CASCADE;

SET session_replication_role = 'origin';
EOF
```

### Étape 4: Appliquer toutes les migrations

```bash
alembic upgrade head
```

### Étape 5: Vérifier

```bash
alembic current
```

---

## 🔄 Alternative: Mettre à jour PostgreSQL Client

Si vous préférez utiliser `pg_dump`:

```bash
# Sur macOS avec Homebrew
brew upgrade postgresql

# Vérifier la version
pg_dump --version

# Puis utiliser le script original
./scripts/copy_staging_to_prod.sh
```

---

## ⚠️ Avertissements

1. **Toutes les données seront supprimées**
2. **Seule la structure des tables sera créée**
3. **La base de données sera vide après l'opération**
4. **Assurez-vous que toutes vos migrations sont à jour**

---

## ✅ Vérification Post-Synchronisation

Après la synchronisation, vérifiez :

1. **Nombre de tables** :
   ```bash
   psql "$DATABASE_URL" -c "\dt" | wc -l
   ```

2. **État des migrations** :
   ```bash
   alembic current
   ```

3. **Structure d'une table exemple** :
   ```bash
   psql "$DATABASE_URL" -c "\d tasks"
   ```

---

## 💡 Recommandation

**Utilisez la méthode Alembic** - c'est la plus sûre et la plus maintenable car elle utilise vos migrations existantes et garantit la cohérence avec votre code.

