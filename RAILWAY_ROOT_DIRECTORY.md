# 🔧 Configuration Railway - Root Directory

## Étape précise à suivre

Dans la page Settings de Railway que vous voyez :

### Section "Source" (tout en haut)

1. **Trouver la ligne** : `Add Root Directory (used for build and deploy steps. Docs↗)`

2. **Cliquer sur "Add Root Directory"** (si c'est un lien/bouton)

3. **OU directement dans le champ** (si c'est un input) :
   - Entrer : `backend`
   - **SANS slash avant** : pas `/backend`, juste `backend`

4. **Cliquer sur "Update"** (bouton en bas de la page)

## Résultat attendu

Après avoir mis à jour :
- Railway va redéployer automatiquement
- Les logs devraient montrer Python au lieu de Node.js
- Le build devrait installer les dépendances Python depuis `backend/requirements.txt`
- Le start command devrait utiliser `uvicorn app.main:app`

## Vérification

Dans la section **Build** :
- Builder devrait rester sur "Railpack"
- Mais il devrait détecter Python au lieu de Node.js

Dans la section **Deploy** :
- Le Start Command devrait être : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- (Cela vient du Procfile dans le dossier `backend`)

## Si ça ne marche pas

Si Railway ne détecte toujours pas Python après avoir mis `backend` :

1. Vérifier que le dossier `backend` existe bien dans le repo GitHub
2. Vérifier que `backend/requirements.txt` existe
3. Vérifier que `backend/Procfile` existe avec : `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
