# 🚨 Action Immédiate - Configuration Railway

## Vous ne trouvez pas "Root Directory" ?

Selon la documentation Railway, l'option **"Root Directory"** devrait être dans :
**Settings → Source → Set the Root Directory**

## Si elle n'apparaît toujours pas, voici les solutions :

### Solution 1 : Recréer le service (RECOMMANDÉ)

1. **Supprimer le service actuel** dans Railway
2. **Créer un nouveau service** : "New Service" → "GitHub Repo"
3. **Sélectionner** : `szrework-cloud/lokario`
4. **Dans l'écran de création**, chercher une option comme :
   - "Source Directory"
   - "Root Directory" 
   - "Working Directory"
   - "Base Directory"
5. **Mettre** : `backend`
6. **Builder** : Railpack (Default)
7. **Déployer**

### Solution 2 : Utiliser Dockerfile

J'ai créé un `backend/Dockerfile`. 

1. Dans Railway → Settings → Build → Builder
2. Changer vers **"Dockerfile"**
3. Railway cherchera automatiquement un Dockerfile

**MAIS** : Si Root Directory n'est pas configuré, Railway cherchera `Dockerfile` à la racine, pas dans `backend/`.

### Solution 3 : Créer un Dockerfile à la racine (temporaire)

Si rien ne fonctionne, on peut créer un Dockerfile à la racine qui pointe vers le backend, mais ce n'est pas idéal.

## Ce que j'ai créé pour vous

✅ `backend/Dockerfile` - Dockerfile pour le backend
✅ `backend/railpack.json` - Configuration Railpack
✅ `railway.json` à la racine - Configuration Railway

## Prochaine étape

**Essayez de recréer le service** avec Root Directory = `backend` configuré dès le départ. C'est la solution la plus propre pour un monorepo.
