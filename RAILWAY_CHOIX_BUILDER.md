# ✅ Choix du Builder Railway

## Choisir : **Railpack (Default)**

Railpack est le nouveau builder par défaut de Railway et remplace Nixpacks (qui est déprécié).

## ⚠️ IMPORTANT : Configurer le Root Directory d'abord

Avant de choisir Railpack, vous DEVEZ configurer le Root Directory :

### Dans Railway Dashboard → Settings → Source

1. **Trouver "Add Root Directory"**
2. **Ajouter** : `backend`
3. **Sauvegarder**

## Pourquoi Railpack détecte Node.js actuellement ?

Parce que Railway regarde à la **racine** du projet et trouve `package.json` (Next.js), donc il pense que c'est un projet Node.js.

Une fois que vous configurez **Root Directory = `backend`**, Railway regardera dans le dossier `backend/` et trouvera :
- ✅ `requirements.txt` → Détectera Python
- ✅ `Procfile` → Utilisera la commande de démarrage Python

## Configuration complète

1. **Root Directory** (Settings → Source) : `backend`
2. **Builder** (Settings → Build) : **Railpack (Default)** ✅
3. **Build Command** : (vide - laisser Railpack détecter automatiquement)
4. **Start Command** : (vide - utilise automatiquement le Procfile)

## Résultat attendu

Avec Root Directory = `backend` et Builder = Railpack :
- Railpack détectera Python (grâce à `requirements.txt`)
- Installera les dépendances Python
- Utilisera le Procfile pour démarrer : `uvicorn app.main:app`

Les logs devraient montrer :
```
Detecting Python...
Installing dependencies from requirements.txt...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
