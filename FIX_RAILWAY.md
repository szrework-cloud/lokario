# 🔧 Correction Railway - Configuration du Root Directory

## Problème détecté

Railway démarre Next.js au lieu de FastAPI car le **Root Directory** n'est pas configuré correctement.

## Solution : Configurer le Root Directory dans Railway

### Étapes à suivre dans Railway Dashboard :

1. **Aller dans votre projet Railway**
2. **Cliquer sur votre service** (celui qui est en train de démarrer)
3. **Aller dans "Settings"** (en haut à droite)
4. **Trouver la section "Source"**
5. **Modifier "Root Directory"** :
   - Actuellement : probablement vide ou `./`
   - **Changer pour** : `backend`
6. **Sauvegarder**

### Alternative : Utiliser railway.json

Vous pouvez aussi créer un fichier `railway.json` à la racine du projet :

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Mais la solution la plus simple est de configurer le **Root Directory** dans les Settings Railway.

## Vérification

Une fois corrigé, Railway devrait :
- Détecter Python (au lieu de Node.js)
- Installer les dépendances Python depuis `backend/requirements.txt`
- Démarrer avec : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Logs à vérifier

Après correction, les logs Railway devraient montrer :
```
Installing Python dependencies...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Au lieu de :
```
Starting: next start
```
