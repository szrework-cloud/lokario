# 🔍 Debug : Erreur "cd could not be found" sur Railway

## Problème

L'erreur `The executable 'cd' could not be found` persiste malgré :
- ✅ Start Command vide dans Railway
- ✅ Dockerfile avec CMD correct
- ✅ Pas de scripts utilisant `cd`

## Hypothèses

Cette erreur suggère que Railway essaie d'exécuter quelque chose qui utilise `cd` en dehors d'un contexte shell.

### Possibilités :

1. **Railway a une configuration cachée** qui override le CMD
2. **Un service/plugin Railway** essaie d'exécuter quelque chose
3. **Le Dockerfile est mal interprété** par Railway
4. **Un healthcheck ou autre** essaie d'utiliser `cd`

## Solution actuelle testée

```dockerfile
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

Cela utilise explicitement `sh -c` pour garantir que la commande est exécutée dans un shell.

## Si ça ne fonctionne toujours pas

### Option 1 : Utiliser un script Python au lieu de uvicorn direct

Créer un script `start.py` :
```python
import os
import uvicorn

port = int(os.getenv("PORT", "8000"))
uvicorn.run("app.main:app", host="0.0.0.0", port=port)
```

Et dans le Dockerfile :
```dockerfile
CMD ["python", "start.py"]
```

### Option 2 : Vérifier les logs Railway complets

Les logs Railway peuvent révéler exactement quelle commande est exécutée avant l'erreur.

### Option 3 : Contacter le support Railway

Si rien ne fonctionne, il peut s'agir d'un bug Railway ou d'une configuration spécifique à votre projet.

## Vérifications à faire dans Railway

1. **Settings → Deploy → Start Command** : Doit être vide
2. **Settings → Deploy → Health Check** : Vérifier qu'il n'y a pas de commande custom
3. **Settings → Variables** : Vérifier qu'il n'y a pas de variable qui pourrait affecter le démarrage
4. **Service → Deployments → View Logs** : Lire les logs complets avant l'erreur
