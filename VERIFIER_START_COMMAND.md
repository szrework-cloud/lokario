# ⚠️ IMPORTANT : Vérifier le Start Command dans Railway

## Le problème

L'erreur `The executable 'cd' could not be found` signifie qu'il y a probablement une **Start Command personnalisée** dans Railway qui essaie d'utiliser `cd backend && ...`.

## Solution IMMÉDIATE

### Dans Railway Dashboard → Settings → Deploy

1. **Chercher "Custom Start Command"** ou **"Start Command"**
2. **SUPPRIMER COMPLÈTEMENT** tout ce qui est dans ce champ
3. **Laisser le champ VIDE**
4. **Sauvegarder** (Update)

### Pourquoi ?

Quand vous utilisez un Dockerfile, la commande de démarrage est définie dans le **CMD** ou **ENTRYPOINT** du Dockerfile. Railway ne doit PAS avoir de Start Command supplémentaire qui essaierait de faire `cd backend`.

## Vérification

Après avoir vidé le Start Command, Railway devrait :
1. Utiliser uniquement le CMD du Dockerfile
2. Démarrer avec : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Le container devrait démarrer correctement

## Si le champ est déjà vide

Si le Start Command est déjà vide mais que l'erreur persiste, il peut y avoir un problème avec le `railway.json`. Vérifiez que le fichier `railway.json` n'a pas de `startCommand` qui interfère.
