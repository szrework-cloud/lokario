# ✅ Solution Simple pour Railway

## J'ai créé un Dockerfile à la racine

J'ai créé `Dockerfile` à la racine du projet qui pointe vers le dossier `backend/`.

## Dans Railway Dashboard

### 1. Changer le Builder

**Settings → Build → Builder** :
- Changer de "Railpack" vers **"Dockerfile"**
- Cliquer sur "Update"

### 2. Build Command et Start Command

- **Build Command** : (vide - laisser Dockerfile gérer)
- **Start Command** : (vide - laisser Dockerfile gérer)

### 3. Déployer

Railway va automatiquement :
1. Détecter le `Dockerfile` à la racine
2. Construire l'image Docker
3. Installer les dépendances Python depuis `backend/requirements.txt`
4. Démarrer avec `uvicorn app.main:app`

## Résultat attendu

Les logs devraient montrer :
```
Building Docker image...
Installing Python dependencies...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Avantages de cette solution

✅ Pas besoin de configurer Root Directory
✅ Dockerfile gère tout automatiquement
✅ Fonctionne même si Root Directory n'est pas disponible
✅ Solution simple et fiable

## Test

Une fois déployé, testez :
- `https://votre-backend.railway.app/docs` (documentation FastAPI)
- `https://votre-backend.railway.app/health` (si vous avez un endpoint health)
