# ✅ Solution finale pour Railway

## Problème résolu

L'erreur `The executable 'cd' could not be found` était causée par :
1. Un conflit potentiel avec le `Procfile` dans `backend/`
2. Le besoin d'exclure certains fichiers du build Docker

## Corrections apportées

### 1. Dockerfile simplifié
Le Dockerfile utilise maintenant une commande CMD simple et directe :
```dockerfile
CMD ["/bin/sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
```

### 2. .dockerignore mis à jour
Les fichiers suivants sont maintenant exclus du build Docker :
- `Procfile` (pour éviter les conflits avec Railway)
- `*.sh` (scripts shell non nécessaires dans le container)
- `railway.json`, `railway.toml`, `nixpacks.toml` (fichiers de config non nécessaires dans le container)

### 3. railway.json simplifié
Le fichier `railway.json` ne contient plus de `startCommand` - tout est géré par le Dockerfile.

## Configuration Railway

Dans Railway Dashboard → Settings → Deploy :

1. **Builder** : `Dockerfile`
2. **Dockerfile Path** : `/Dockerfile` (ou laisser vide si à la racine)
3. **Start Command** : **LAISSER VIDE** ✅
4. **Root Directory** : Laisser vide (le Dockerfile gère tout)

## Le container devrait maintenant démarrer correctement

Le build Docker :
1. ✅ Installe les dépendances Python
2. ✅ Copie le code backend
3. ✅ Démarre uvicorn avec le bon port

Plus besoin de `cd` ou de scripts supplémentaires - tout est géré par le Dockerfile.
