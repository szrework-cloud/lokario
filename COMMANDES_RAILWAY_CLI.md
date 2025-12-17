# 🚂 Commandes Railway CLI à exécuter

## Exécutez ces commandes dans VOTRE terminal (pas ici) :

```bash
# 1. Aller dans le dossier du projet
cd "/Users/glr_adem/Documents/B2B SAAS"

# 2. Se connecter à Railway (ouvrira votre navigateur)
npx @railway/cli login

# 3. Lier le projet à Railway
npx @railway/cli link
# Sélectionnez votre projet "lokario" dans la liste

# 4. Voir les services
npx @railway/cli service

# 5. Ouvrir le dashboard dans le navigateur
npx @railway/cli open
```

## Important : Configuration du Root Directory

Malheureusement, **Railway CLI ne permet pas de configurer directement le Root Directory** via la ligne de commande.

### Solution :

1. Après avoir exécuté `npx @railway/cli open`, vous serez sur la page Railway
2. Allez dans **Settings** → **Source**
3. Cherchez **"Add Root Directory"** ou **"Root Directory"**
4. Ajoutez : `backend`
5. Cliquez sur **"Update"**

### Ou recréer le service :

Si vous ne trouvez toujours pas le champ :

1. **Supprimez le service actuel** (Settings → Delete Service)
2. **Créez un nouveau service** : "New Service" → "GitHub Repo"
3. **Sélectionnez** : `szrework-cloud/lokario`
4. **Avant de déployer**, allez dans Settings → Source
5. **Ajoutez** : `backend` dans Root Directory
6. **Puis déployez**

## Vérification

Après configuration, les logs Railway devraient montrer :
```
Installing Python dependencies...
Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Au lieu de :
```
Starting: next start
```
