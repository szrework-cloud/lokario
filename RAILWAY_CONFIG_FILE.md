# ✅ Configuration Railway via Config File

## Fichier créé

J'ai créé deux fichiers de configuration Railway à la racine du projet :

1. **`railway.json`** (format JSON)
2. **`railway.toml`** (format TOML - souvent préféré)

## Dans Railway Dashboard

1. **Aller dans Settings** → **Config-as-code** → **Railway Config File**
2. **Ajouter le chemin** : `railway.json` ou `railway.toml`
3. **OU** : Railway devrait le détecter automatiquement s'il est à la racine

## Ce que le fichier configure

- ✅ **Build Command** : `cd backend && pip install -r requirements.txt`
- ✅ **Start Command** : `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- ✅ **Healthcheck** : `/docs` (documentation FastAPI)
- ✅ **Restart Policy** : Redémarre en cas d'échec

## Vérification

Après que Railway détecte le fichier de configuration :

1. Railway va utiliser les commandes spécifiées
2. Le build devrait installer les dépendances Python
3. Le démarrage devrait utiliser uvicorn avec FastAPI
4. Les logs devraient montrer :
   ```
   Installing Python dependencies...
   Starting: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

## Si Railway ne détecte pas automatiquement

Dans Railway Dashboard :
- Settings → Config-as-code → Railway Config File
- Ajoutez le chemin : `railway.json`
- Cliquez sur "Update"

Le fichier est maintenant poussé sur GitHub, Railway devrait le détecter au prochain déploiement !
