# 🔧 Fix : Railway ajoute automatiquement "cd backend"

## Le problème

Railway ajoute automatiquement la commande de build :
```
cd backend && pip install -r requirements.txt
```

Cela cause l'erreur `cd could not be found` car Railway essaie d'exécuter cette commande lors du démarrage du container.

## Solution : Forcer Railway à utiliser uniquement le Dockerfile

### 1. Dans Railway Dashboard

Allez dans **Settings → Build** (ou **Settings → Deploy**) et :

1. **Builder** : Sélectionnez **"Dockerfile"** explicitement
2. **Build Command** : **LAISSER VIDE** (supprimez tout ce qui est là)
3. **Start Command** : **LAISSER VIDE** (supprimez tout)
4. **Root Directory** : **LAISSER VIDE**

### 2. Fichier railway.json

J'ai mis à jour le fichier `railway.json` pour forcer Railway à utiliser uniquement le Dockerfile :

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "",
    ...
  }
}
```

Le `startCommand` vide force Railway à utiliser l'ENTRYPOINT du Dockerfile.

## Pourquoi ça arrive

Railway essaie d'être "intelligent" et détecte automatiquement :
- Un dossier `backend/`
- Un fichier `requirements.txt` dans `backend/`
- Et pense qu'il doit faire `cd backend` pour installer les dépendances

Mais comme on utilise un Dockerfile, on n'a **pas besoin** de cette détection automatique.

## Après avoir fait ça

1. Commitez et poussez les changements (déjà fait)
2. Dans Railway, supprimez les commandes automatiques
3. Forcez un nouveau déploiement

Le container devrait maintenant démarrer correctement avec notre ENTRYPOINT Python.
