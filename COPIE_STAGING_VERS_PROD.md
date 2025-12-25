# 📋 Guide: Copier le Schéma de Staging vers Production (Base Vide)

**⚠️ ATTENTION**: Cette opération va :
- ✅ Copier la **structure des tables** (schéma) de staging vers production
- ❌ **Supprimer toutes les données** existantes en production
- 📭 Laisser la base de données **vide** (sans données)

---

## 🔍 Prérequis

1. **Avoir `pg_dump` et `psql` installés** (outils PostgreSQL)
2. **Avoir accès aux deux bases de données** (staging et production)
3. **Avoir fait un backup de production** (automatique avec le script)

---

## 🚀 Méthode 1: Script Bash (Recommandé)

### Étape 1: Exécuter le script

```bash
cd backend
./scripts/copy_staging_to_prod.sh
```

Le script va :
1. ✅ Créer un backup automatique du schéma de production
2. ✅ Exporter le **schéma uniquement** de staging (sans données)
3. ✅ Importer le schéma dans production (base vide)
4. ✅ Vous demander confirmation à chaque étape

---

## 🐍 Méthode 2: Script Python (Alternative)

```bash
cd backend
python3 scripts/copy_staging_to_prod_safe.py
```

---

## 📝 Méthode 3: Commandes Manuelles

Si vous préférez faire les étapes manuellement :

### Étape 1: Backup du schéma de production

```bash
# Créer le répertoire de backup
mkdir -p backend/backups

# Backup du schéma de production (sans données)
export PROD_DB_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
pg_dump "$PROD_DB_URL" --clean --if-exists --schema-only > backend/backups/prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 2: Export du schéma de staging (sans données)

```bash
# Encoder correctement l'URL de staging
export STAGING_DB_URL="postgresql://postgres.hobsxwtqnxrdrpmnuoga:ADEM-2006*gurler@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
# Encoder le * dans le mot de passe
STAGING_ENCODED=$(echo "$STAGING_DB_URL" | sed 's/\*/%2A/g')

# Export du schéma uniquement (sans données)
pg_dump "$STAGING_ENCODED" --clean --if-exists --schema-only > backend/backups/staging_dump_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 3: Import dans production

```bash
# Import
DUMP_FILE="backend/backups/staging_dump_XXXXXX.sql"  # Remplacer par le nom réel
psql "$PROD_DB_URL" < "$DUMP_FILE"
```

---

## ⚠️ Avertissements Importants

1. **Toutes les données de production seront supprimées**
2. **Seule la structure des tables sera copiée (schéma)**
3. **La base de données sera vide après l'opération**
4. **Les migrations Alembic seront synchronisées avec staging**
5. **Faites un backup complet avant de commencer**

---

## 🔄 En cas de problème: Restaurer le backup

Si quelque chose se passe mal, vous pouvez restaurer le backup de production :

```bash
BACKUP_FILE="backend/backups/prod_backup_XXXXXX.sql"  # Remplacer par le nom réel
export PROD_DB_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
psql "$PROD_DB_URL" < "$BACKUP_FILE"
```

---

## ✅ Vérification après copie

Après la copie, vérifiez :

1. **L'état des migrations Alembic** :
   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
   alembic current
   ```

2. **Le nombre de tables** :
   ```bash
   psql "$PROD_DB_URL" -c "\dt" | wc -l
   ```

3. **Les données importantes** (utilisateurs, entreprises, etc.)

---

## 📁 Fichiers créés

Les scripts créent automatiquement des fichiers dans `backend/backups/` :
- `prod_backup_YYYYMMDD_HHMMSS.sql` : Backup de production
- `staging_dump_YYYYMMDD_HHMMSS.sql` : Dump de staging

**💡 Gardez ces fichiers au cas où vous auriez besoin de restaurer !**

