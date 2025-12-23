# Comment exécuter le script de vérification

## Option 1 : Via Railway CLI (Recommandé pour staging/production)

### Étape 1 : Lier le projet Railway
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
railway link
```
Sélectionnez votre projet "lokario" dans la liste.

### Étape 2 : Exécuter le script
```bash
railway run python check_migration.py
```

## Option 2 : Localement (si vous avez DATABASE_URL)

### Étape 1 : Exporter DATABASE_URL
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
export DATABASE_URL="votre_database_url_ici"
```

### Étape 2 : Exécuter le script
```bash
python check_migration.py
```

## Option 3 : Via Railway Dashboard (Sans CLI)

1. Allez sur [railway.app](https://railway.app)
2. Ouvrez votre projet "lokario"
3. Cliquez sur votre service backend
4. Allez dans l'onglet **"Deployments"**
5. Cliquez sur le dernier déploiement
6. Cliquez sur **"Shell"** ou **"Logs"**
7. Exécutez :
   ```bash
   python check_migration.py
   ```

## Résultats attendus

### ✅ Tout est bon
```
✅ TOUT EST BON: La migration est appliquée correctement
```

### ❌ Problème
```
❌ PROBLÈME: La migration n'a PAS été appliquée
   → Exécutez: alembic upgrade head
```

## Si Railway CLI n'est pas installé

```bash
npm install -g @railway/cli
railway login
railway link
```

