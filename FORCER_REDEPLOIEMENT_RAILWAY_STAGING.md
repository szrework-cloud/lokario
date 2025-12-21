# 🔄 Forcer le Redéploiement Railway Staging

## Problème
Railway n'a pas redéployé automatiquement après le push sur `staging`.

## Solutions

### Solution 1 : Vérifier la Configuration Railway

1. **Railway Dashboard** → Service `lokario-backend-staging`
2. **Settings** → **Source**
3. Vérifiez que :
   - **Branch** : `staging` (pas `main`)
   - **Root Directory** : `backend` (si monorepo)
   - **Auto Deploy** : Activé ✅

### Solution 2 : Forcer un Redéploiement Manuel

#### Option A : Via l'Interface Railway

1. **Railway Dashboard** → Service `lokario-backend-staging`
2. Onglet **"Deployments"**
3. Cliquez sur **"..."** (trois points) sur le dernier déploiement
4. Sélectionnez **"Redeploy"**

#### Option B : Via un Commit Vide (Déclencher un nouveau push)

```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
git checkout staging
git commit --allow-empty -m "chore: trigger Railway redeploy"
git push origin staging
```

#### Option C : Via Railway CLI

```bash
# Se connecter à Railway
npx @railway/cli login

# Lier le projet
npx @railway/cli link

# Forcer un redéploiement
npx @railway/cli up --detach
```

### Solution 3 : Vérifier que Railway est Connecté au Bon Dépôt

1. **Railway Dashboard** → Service `lokario-backend-staging`
2. **Settings** → **Source**
3. Vérifiez que le dépôt est : `szrework-cloud/lokario`
4. Si ce n'est pas le bon, reconnectez :
   - **Disconnect** → **Connect GitHub** → Sélectionnez le bon dépôt

### Solution 4 : Vérifier les Webhooks GitHub

1. **GitHub** → Dépôt `szrework-cloud/lokario`
2. **Settings** → **Webhooks**
3. Cherchez un webhook Railway
4. Vérifiez qu'il est **actif** et qu'il écoute les événements `push` sur la branche `staging`

## Vérification

Après le redéploiement, vérifiez les logs Railway :

1. **Railway Dashboard** → Service `lokario-backend-staging`
2. Onglet **"Deployments"** → Cliquez sur le dernier déploiement
3. Onglet **"Logs"**
4. Cherchez les logs CORS :
   ```
   🌐 CORS - Origines autorisées: [...]
   🌐 CORS - Environnement détecté: staging
   🌐 CORS - Configuration staging: regex + X origines spécifiques
   ```

## Si Rien ne Fonctionne

1. **Supprimer et Recréer le Service** :
   - Railway Dashboard → Service `lokario-backend-staging`
   - Settings → Delete Service
   - Créer un nouveau service
   - Connecter le dépôt GitHub
   - Sélectionner la branche `staging`
   - Configurer les variables d'environnement
   - Déployer

