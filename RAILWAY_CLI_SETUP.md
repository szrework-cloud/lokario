# 🚂 Configuration Railway via CLI

## Étapes à suivre

### 1. Installation (déjà fait si vous voyez la version)
```bash
npm install -g @railway/cli
```

### 2. Connexion à Railway
```bash
railway login
```
Cela ouvrira votre navigateur pour vous connecter avec GitHub.

### 3. Lier le projet
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
railway link
```
Sélectionnez votre projet Railway dans la liste.

### 4. Configurer le Root Directory

Il n'y a pas de variable directe `RAILWAY_ROOT_DIRECTORY`. Il faut utiliser la commande pour modifier la configuration du service :

```bash
# Vérifier les services
railway service

# Ouvrir les settings dans le navigateur pour configurer manuellement
railway open
```

**OU** utiliser l'API Railway directement :

```bash
# Obtenir le service ID
railway service

# Configurer via l'API (remplacer SERVICE_ID par l'ID de votre service)
railway variables set RAILWAY_SERVICE_ROOT=backend
```

### 5. Alternative : Utiliser railway.json

Le fichier `railway.json` que j'ai créé devrait être détecté automatiquement, mais il doit être dans le bon répertoire.

### 6. Redéployer
```bash
railway up
```

## Notes importantes

Railway CLI peut nécessiter que vous soyez dans le bon dossier. Si `railway.json` est à la racine mais que le service doit pointer vers `backend`, Railway peut ne pas le détecter correctement.

**Solution recommandée** : Utiliser l'interface web Railway pour configurer le Root Directory, ou recréer le service en spécifiant le dossier `backend` dès le départ.
