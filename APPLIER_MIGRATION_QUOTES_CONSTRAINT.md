# Applier la migration de la contrainte unique sur quotes.number

## Problème

L'erreur suivante se produit lors de la création d'un devis :
```
duplicate key value violates unique constraint "ix_quotes_number"
```

Cela signifie que la contrainte globale `ix_quotes_number` existe encore dans la base de données, empêchant différentes entreprises d'avoir le même numéro de devis (ex: `DEV-2025-001`).

## Solution

La migration `fix_quotes_number_unique_constraint` doit être appliquée pour :
1. Supprimer la contrainte globale `ix_quotes_number`
2. Créer une contrainte composite `uq_quotes_company_number` sur `(company_id, number)`

Cela permet à chaque entreprise d'avoir ses propres numéros de devis séquentiels.

## Méthode 1 : Via Alembic (Recommandé)

### Sur Railway

1. **Via Railway CLI** :
   ```bash
   railway run alembic upgrade head
   ```

2. **Via Railway Dashboard** :
   - Allez dans votre projet Railway
   - Ouvrez le service backend
   - Cliquez sur "Shell" ou "Deployments"
   - Exécutez : `alembic upgrade head`

### Sur Supabase (local)

```bash
cd backend
export DATABASE_URL="votre_database_url"
alembic upgrade head
```

## Méthode 2 : Via le script Python

Un script Python est disponible pour vérifier et appliquer la migration automatiquement :

```bash
cd backend
python scripts/check_and_fix_quotes_constraint.py
```

Ce script :
- ✅ Vérifie l'état actuel des contraintes
- ✅ Applique la migration si nécessaire
- ✅ Fournit des messages clairs sur les actions effectuées

## Vérification

Après avoir appliqué la migration, vous pouvez vérifier que tout fonctionne :

1. **Vérifier les contraintes** :
   ```sql
   -- Vérifier que l'index global n'existe plus
   SELECT indexname FROM pg_indexes WHERE tablename = 'quotes' AND indexname = 'ix_quotes_number';
   -- Devrait retourner 0 lignes
   
   -- Vérifier que la contrainte composite existe
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'quotes' 
   AND constraint_name = 'uq_quotes_company_number';
   -- Devrait retourner 1 ligne
   ```

2. **Tester la création d'un devis** :
   - Créez un devis pour une entreprise
   - Créez un devis avec le même numéro pour une autre entreprise
   - Les deux devis devraient être créés sans erreur

## Notes importantes

- ⚠️ **Sauvegarde** : Assurez-vous d'avoir une sauvegarde de la base de données avant d'appliquer la migration
- ⚠️ **Downtime** : La migration est rapide et ne nécessite pas de downtime
- ✅ **Rétrocompatibilité** : Les devis existants ne sont pas affectés

## En cas de problème

Si la migration échoue :

1. **Vérifier les logs** :
   ```bash
   railway logs
   ```

2. **Vérifier l'état des migrations** :
   ```bash
   railway run alembic current
   ```

3. **Vérifier l'historique des migrations** :
   ```bash
   railway run alembic history
   ```

4. **Appliquer manuellement** (si nécessaire) :
   ```sql
   -- Supprimer l'index global
   DROP INDEX IF EXISTS ix_quotes_number;
   
   -- Créer la contrainte composite
   ALTER TABLE quotes 
   ADD CONSTRAINT uq_quotes_company_number 
   UNIQUE (company_id, number);
   ```

## Migration concernée

- **Fichier** : `backend/alembic/versions/fix_quotes_number_unique_constraint.py`
- **Revision ID** : `fix_quotes_number_unique`
- **Description** : Modifie la contrainte unique sur `quotes.number` pour qu'elle soit composite avec `company_id`

