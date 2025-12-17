# 🔍 Explication de l'erreur "cd could not be found"

## Qu'est-ce que `cd` ?

`cd` (change directory) est une commande **shell** qui permet de changer de répertoire de travail. C'est une commande **built-in** du shell, pas un exécutable séparé.

## Pourquoi l'erreur ?

L'erreur `The executable 'cd' could not be found` signifie que quelque chose essaie d'exécuter `cd` **comme un exécutable** (comme `/usr/bin/cd`), mais `cd` n'existe pas en tant qu'exécutable - c'est une commande interne du shell.

## Scénarios possibles

### 1. Start Command dans Railway
Si Railway a une Start Command configurée comme :
```
cd /app && python start.py
```
Railway pourrait essayer d'exécuter `cd` directement (sans shell).

### 2. Script mal configuré
Un script qui utilise `cd` mais n'est pas exécuté via un shell.

### 3. Configuration Railway cachée
Railway pourrait avoir une configuration quelque part qui essaie d'utiliser `cd`.

## Solution : Vérifier dans Railway

Dans Railway Dashboard → Settings → Deploy :
- **Start Command** : Doit être **COMPLÈTEMENT VIDE**
- **Build Command** : Doit être vide ou utiliser Docker
- **Health Check Command** : Vérifier qu'il n'y a pas de `cd`

## Notre Dockerfile actuel

Notre Dockerfile utilise maintenant :
```dockerfile
CMD ["python", "start.py"]
```

C'est une commande **directe** qui ne devrait jamais nécessiter `cd` car :
- `WORKDIR /app` définit déjà le répertoire de travail
- `python` est dans le PATH
- `start.py` est dans le répertoire de travail actuel

## Si l'erreur persiste

Cela suggère que Railway essaie d'exécuter quelque chose **AVANT** notre CMD, ou qu'il y a une configuration qui override notre CMD.
