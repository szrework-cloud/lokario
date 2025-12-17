# 🔧 Fix Railway - Utiliser Python au lieu de Node.js

## Problème

Railway utilise Docker/Node.js au lieu de NIXPACKS/Python pour construire l'application.

## Solution dans Railway Dashboard

### 1. Changer le Builder

Dans Railway Dashboard → Settings → Build :

1. **Trouver "Builder"**
2. **Changer de "Docker" ou "Railpack" vers "NIXPACKS"**
3. **Sauvegarder**

### 2. Configurer le Root Directory

**IMPORTANT** : Même avec le fichier `railway.json`, vous devez configurer le Root Directory dans l'interface :

1. Settings → Source
2. Ajouter dans "Root Directory" : `backend`
3. Sauvegarder

### 3. Utiliser le fichier railway.json

Dans Settings → Config-as-code → Railway Config File :
- Ajouter le chemin : `railway.json`

**OU** si Railway doit lire depuis le dossier backend :
- Ajouter le chemin : `backend/railway.json`

## Fichiers créés

J'ai créé :
- ✅ `railway.json` à la racine (pour Railway Config File)
- ✅ `backend/railway.json` (alternative)
- ✅ `backend/nixpacks.toml` (configuration NIXPACKS)

## Résultat attendu

Après configuration, Railway devrait :
1. Détecter Python (grâce à `requirements.txt` dans `backend/`)
2. Installer les dépendances Python
3. Démarrer avec `uvicorn app.main:app`

Les logs devraient montrer :
```
Detecting Python...
Installing dependencies from requirements.txt...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Si ça ne marche toujours pas

Recréer le service :
1. Supprimer le service actuel
2. Créer un nouveau service → GitHub Repo
3. **Avant de déployer** :
   - Builder : NIXPACKS
   - Root Directory : `backend`
   - Config File : `railway.json` (ou laisser vide, NIXPACKS détectera Python automatiquement)
