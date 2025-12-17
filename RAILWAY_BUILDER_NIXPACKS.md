# 🔧 Changer le Builder Railway vers NIXPACKS

## Problème actuel

Railway utilise **Railpack** (Docker/Node.js) au lieu de **NIXPACKS** (Python).

## Solution : Changer le Builder

### Dans Railway Dashboard → Settings → Build

1. **Trouver la section "Builder"**
2. **Actuellement affiché** : "Railpack" (Default)
3. **Cliquer sur le menu déroulant "Railpack"**
4. **Sélectionner "NIXPACKS"** dans la liste
5. **Sauvegarder** (bouton Update en bas)

### Si NIXPACKS n'apparaît pas dans la liste

Railway devrait avoir ces options :
- **Railpack** (Default) ← Actuellement sélectionné
- **NIXPACKS** ← Sélectionner celui-ci
- **Dockerfile** (si vous avez un Dockerfile)

### Pour "Build Command"

**Laissez-le VIDE** quand vous utilisez NIXPACKS.

NIXPACKS détecte automatiquement :
- Python (grâce à `requirements.txt` dans `backend/`)
- Les dépendances à installer
- La commande de démarrage (grâce au `Procfile` dans `backend/`)

### Pour "Watch Paths"

**Laissez-le vide** pour l'instant, ou ajoutez :
```
backend/**
```

Cela déclenchera un redéploiement quand des fichiers dans `backend/` changent.

## Configuration complète recommandée

1. **Builder** : `NIXPACKS`
2. **Root Directory** (dans Settings → Source) : `backend`
3. **Build Command** : (vide)
4. **Start Command** : (vide, utilise le Procfile automatiquement)
5. **Watch Paths** : `backend/**` (optionnel)

## Résultat attendu

Après avoir changé vers NIXPACKS, Railway devrait :
- Détecter Python
- Installer les dépendances depuis `backend/requirements.txt`
- Démarrer avec `uvicorn app.main:app` (depuis le Procfile)

Les logs devraient montrer :
```
Detecting Python...
Installing dependencies...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
