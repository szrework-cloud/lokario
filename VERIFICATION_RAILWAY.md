# ✅ Vérifications à faire dans Railway

## L'erreur "cd could not be found"

Cette erreur signifie que Railway essaie d'exécuter `cd` comme un exécutable, ce qui n'est pas possible.

## Vérifications CRITIQUES dans Railway Dashboard

### 1. Settings → Deploy → Start Command
**⚠️ DOIT ÊTRE COMPLÈTEMENT VIDE**

Si vous voyez quelque chose comme :
- `cd /app && python start.py`
- `cd backend && ...`
- N'importe quelle commande avec `cd`

**→ SUPPRIMEZ-LE COMPLÈTEMENT**

### 2. Settings → Source
Vérifier qu'il n'y a pas de "Root Directory" configuré qui pourrait causer des problèmes.

### 3. Settings → Health Check
Vérifier qu'il n'y a pas de "Health Check Command" qui utilise `cd`.

### 4. Variables d'environnement
Aller dans Settings → Variables et vérifier qu'il n'y a pas de variable comme :
- `START_COMMAND`
- `CMD`
- `ENTRYPOINT`
- Ou toute autre variable qui pourrait affecter le démarrage

## Notre configuration actuelle

### Dockerfile
```dockerfile
ENTRYPOINT ["python", "start.py"]
```

Cette configuration :
- ✅ Utilise ENTRYPOINT (plus difficile à override)
- ✅ Pas de shell nécessaire
- ✅ Pas de `cd` nécessaire (WORKDIR /app définit déjà le répertoire)
- ✅ Commande directe et claire

### Script start.py
```python
import os
import uvicorn

port = int(os.getenv("PORT", "8000"))
uvicorn.run("app.main:app", host="0.0.0.0", port=port)
```

## Si l'erreur persiste

Si après avoir vérifié tout ça l'erreur persiste, il se peut que :
1. Railway ait un bug ou une configuration cachée
2. Il y ait un problème avec le projet/service Railway lui-même

**Solution : Créer un nouveau service Railway** et le connecter au même repo pour tester.
