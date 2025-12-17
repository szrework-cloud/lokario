# 🔧 Solution Railway - Monorepo avec Backend

## Problème

L'option "Root Directory" n'est pas visible dans Railway Settings.

## Solution alternative : Créer un nouveau service séparé

Puisque Railway ne détecte pas facilement le dossier backend, la **meilleure solution** est de créer un **nouveau service séparé** qui pointe directement vers le dossier backend.

### Option 1 : Recréer le service avec la bonne configuration

1. **Dans Railway Dashboard** :
   - Supprimer le service actuel (Settings → Delete Service)
   - OU créer un nouveau projet/service

2. **Créer un nouveau service** :
   - "New Service" → "GitHub Repo"
   - Sélectionner : `szrework-cloud/lokario`
   
3. **AVANT de déployer**, configurer :
   - Dans l'écran de création du service, chercher "Root Directory" ou "Source Directory"
   - Si vous ne le voyez pas, utilisez l'Option 2 ci-dessous

### Option 2 : Utiliser un fichier de configuration Railway à la racine

Créer un fichier `railway.json` à la racine qui pointe vers le backend :

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

**Mais** : Railway cherchera toujours `requirements.txt` à la racine, pas dans `backend/`.

### Option 3 : Créer un Dockerfile dans backend/ (Solution la plus fiable)

Créer `backend/Dockerfile` :

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE $PORT

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

Puis dans Railway :
- Builder : **Dockerfile**
- Railway devrait détecter automatiquement `backend/Dockerfile` si Root Directory est configuré

### Option 4 : Service séparé avec sous-dossier (Recommandé)

La **meilleure solution** pour un monorepo est de créer un **service séparé** :

1. **Dans votre projet Railway**, créer un nouveau service
2. **Pointer vers le même repo** : `szrework-cloud/lokario`
3. **Dans la configuration**, il devrait y avoir une option pour le "Working Directory" ou "Source Path"
4. **Mettre** : `backend`

## Vérification

Une fois configuré, les logs devraient montrer :
```
Installing Python dependencies...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
