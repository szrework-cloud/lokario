# 🔧 Résolution des erreurs Railway

## ❌ Erreur : "There was an error deploying from source"

### Solutions possibles :

#### 1. Vérifier la configuration du Root Directory

Dans Railway :
1. Aller dans **Settings** → **Source**
2. Vérifier que **Root Directory** est bien : `backend`
3. Si vide, ajouter : `backend`

#### 2. Vérifier les fichiers de configuration

Les fichiers suivants doivent exister dans `backend/` :
- ✅ `Procfile` (déjà présent)
- ✅ `requirements.txt` (déjà présent)
- ✅ `runtime.txt` (ajouté)
- ✅ `railway.json` (ajouté)

#### 3. Vérifier la structure du projet

Railway doit trouver :
```
backend/
  ├── app/
  │   └── main.py
  ├── Procfile
  ├── requirements.txt
  ├── runtime.txt
  └── railway.json
```

#### 4. Vérifier les logs Railway

1. Dans Railway, aller dans **Deployments**
2. Cliquer sur le dernier déploiement
3. Voir les **Logs** pour identifier l'erreur exacte

### Erreurs courantes :

#### ❌ "No Python version found"
**Solution** : Le fichier `runtime.txt` est maintenant présent avec `python-3.11.0`

#### ❌ "Module not found"
**Solution** : Vérifier que toutes les dépendances sont dans `requirements.txt`

#### ❌ "Port not found" ou "Cannot bind to port"
**Solution** : Vérifier que le Procfile utilise bien `$PORT` et non un port fixe

#### ❌ "Root directory not found"
**Solution** : 
- Vérifier que Root Directory = `backend` dans Railway Settings
- Vérifier que le repo GitHub contient bien le dossier `backend/`

### Commandes de vérification locale

```bash
# Vérifier que tout est présent
cd backend
ls -la Procfile requirements.txt runtime.txt railway.json

# Vérifier que main.py existe
ls -la app/main.py

# Tester le build localement (simulation)
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Si l'erreur persiste :

1. **Regarder les logs Railway** pour voir l'erreur exacte
2. **Vérifier les variables d'environnement** (toutes doivent être définies)
3. **Créer un nouveau déploiement** après avoir corrigé
4. **Utiliser Railway CLI** pour débugger :
   ```bash
   railway login
   railway link
   railway logs
   ```
