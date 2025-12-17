# 🔧 Fix - Container failed to start: "cd could not be found"

## Problème

Le container démarre mais échoue avec : `The executable 'cd' could not be found`

Cela suggère qu'il y a une **Start Command personnalisée** dans Railway qui essaie d'utiliser `cd`.

## Solution : Vider le Start Command dans Railway

### Dans Railway Dashboard → Settings → Deploy

1. **Trouver "Custom Start Command"** ou **"Start Command"**
2. **Vider complètement ce champ** (supprimer tout ce qui s'y trouve)
3. **Sauvegarder** (Update)

Le Dockerfile contient déjà la commande de démarrage dans le CMD, donc Railway ne doit pas avoir de Start Command supplémentaire.

## Vérification du Dockerfile

Le Dockerfile utilise maintenant :
```dockerfile
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
```

Cela devrait fonctionner correctement si le Start Command dans Railway est vide.

## Si le problème persiste

1. **Vérifier Settings → Deploy → Start Command** : doit être vide
2. **Vérifier Settings → Deploy → Restart Policy** : devrait être "On Failure"
3. **Regarder les logs complets** dans Railway pour voir exactement quelle commande est exécutée

## Alternative : Utiliser ENTRYPOINT

Si ça ne fonctionne toujours pas, on peut utiliser ENTRYPOINT dans le Dockerfile, mais le CMD devrait suffire.
