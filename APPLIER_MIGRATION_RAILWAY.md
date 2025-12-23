# 🔄 Appliquer la migration sur Railway (Staging)

## Problème
Les colonnes `city`, `postal_code`, `country`, `siret` n'existent pas dans la base de données PostgreSQL de staging, ce qui cause une erreur 500 lors de la récupération d'un client.

## Solution : Appliquer la migration

### Option 1 : Via Railway CLI (Recommandé)

1. **Installer Railway CLI** (si pas déjà fait) :
   ```bash
   npm i -g @railway/cli
   ```

2. **Se connecter à Railway** :
   ```bash
   railway login
   ```

3. **Lier le projet** :
   ```bash
   cd "/Users/glr_adem/Documents/B2B SAAS/backend"
   railway link
   ```

4. **Appliquer la migration** :
   ```bash
   railway run alembic upgrade head
   ```

### Option 2 : Via Railway Dashboard (Terminal)

1. **Aller dans Railway Dashboard** :
   - Ouvrir votre projet Railway
   - Sélectionner le service backend
   - Aller dans l'onglet **"Deployments"** ou **"Settings"**

2. **Ouvrir un terminal Railway** :
   - Cliquer sur **"View Logs"** ou **"Shell"**
   - Ou utiliser l'option **"Run Command"**

3. **Exécuter la migration** :
   ```bash
   cd backend
   alembic upgrade head
   ```

### Option 3 : Via script local avec DATABASE_URL

1. **Récupérer DATABASE_URL depuis Railway** :
   - Railway Dashboard → Service backend → Variables
   - Copier la valeur de `DATABASE_URL`

2. **Exécuter le script localement** :
   ```bash
   cd "/Users/glr_adem/Documents/B2B SAAS/backend"
   export DATABASE_URL="<votre-url-railway>"
   chmod +x scripts/apply_migration_railway.sh
   ./scripts/apply_migration_railway.sh
   ```

### Option 4 : Via SQL direct (si les autres méthodes échouent)

Si vous avez accès direct à la base de données PostgreSQL :

```sql
-- Ajouter les colonnes manuellement
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siret VARCHAR(14);

-- Marquer la migration comme appliquée
-- (Récupérer la révision depuis alembic/versions/add_city_postal_code_country_siret_to_clients.py)
INSERT INTO alembic_version (version_num) 
VALUES ('add_city_postal_code_country_siret')
ON CONFLICT (version_num) DO NOTHING;
```

## Vérification

Après avoir appliqué la migration, vérifiez que les colonnes existent :

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('city', 'postal_code', 'country', 'siret');
```

Vous devriez voir les 4 colonnes listées.

## Note importante

⚠️ **La migration doit être appliquée sur la base de données de staging (Railway)**, pas seulement en local. La base de données locale (SQLite) et la base de données de staging (PostgreSQL) sont séparées.

