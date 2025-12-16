# Guide de redémarrage du backend

Ce guide explique comment redémarrer le backend FastAPI de votre application B2B SaaS.

## 📋 Prérequis

- Python 3.8+ installé
- Environnement virtuel Python activé (optionnel mais recommandé)
- Dépendances installées (`pip install -r requirements.txt`)

## 🚀 Méthodes de redémarrage

### Méthode 1 : Utiliser le script de démarrage (Recommandé)

Le projet inclut un script bash `start_backend.sh` qui gère automatiquement l'environnement virtuel et le démarrage.

```bash
# Depuis le répertoire backend
cd backend
chmod +x start_backend.sh  # Si ce n'est pas déjà fait
./start_backend.sh
```

**Avantages :**
- Active automatiquement l'environnement virtuel s'il existe
- Configure les bonnes options uvicorn
- Affiche les URLs utiles (API et documentation)

### Méthode 2 : Commande uvicorn directe

Si vous préférez lancer directement uvicorn :

```bash
# Depuis le répertoire backend
cd backend

# Activer l'environnement virtuel (si vous en utilisez un)
source venv/bin/activate  # Sur macOS/Linux
# ou
venv\Scripts\activate  # Sur Windows

# Démarrer le serveur avec les logs activés
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
```

**Options de la commande :**
- `--reload` : Recharge automatiquement le serveur lors des modifications de code
- `--host 0.0.0.0` : Écoute sur toutes les interfaces réseau
- `--port 8000` : Port d'écoute (8000 par défaut)
- `--log-level info` : Affiche les logs de niveau INFO et supérieur (pour voir les logs de debug)

### Méthode 3 : Avec Python directement

```bash
# Depuis le répertoire backend
cd backend

# Activer l'environnement virtuel (si nécessaire)
source venv/bin/activate

# Démarrer avec Python
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🔄 Redémarrage après modification

### Redémarrage manuel

1. **Arrêter le serveur** : Appuyez sur `Ctrl+C` dans le terminal où le serveur tourne
2. **Relancer** : Utilisez une des méthodes ci-dessus

### Redémarrage automatique (mode développement)

Avec l'option `--reload`, uvicorn redémarre automatiquement le serveur lorsque vous modifiez des fichiers Python. Aucune action manuelle nécessaire !

**Note :** Le rechargement automatique peut prendre quelques secondes. Surveillez les logs dans le terminal.

## 🛑 Arrêter le serveur

Pour arrêter le serveur backend :

1. Trouvez le terminal où le serveur tourne
2. Appuyez sur `Ctrl+C`
3. Attendez la confirmation que le serveur s'est arrêté

## 🔍 Vérifier que le backend fonctionne

Une fois le serveur démarré, vous pouvez vérifier qu'il fonctionne correctement :

1. **Documentation interactive** : http://localhost:8000/docs
2. **Documentation alternative** : http://localhost:8000/redoc
3. **Health check** : http://localhost:8000 (ou l'endpoint de santé si configuré)

## ⚠️ Dépannage

### Le port 8000 est déjà utilisé

Si vous obtenez une erreur indiquant que le port 8000 est occupé :

```bash
# Option 1 : Utiliser un autre port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Option 2 : Trouver et arrêter le processus qui utilise le port 8000
# Sur macOS/Linux
lsof -ti:8000 | xargs kill -9c

# Sur Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Erreurs d'importation

Si vous obtenez des erreurs d'importation :

```bash
# Vérifier que vous êtes dans le bon répertoire
cd backend

# Réinstaller les dépendances
pip install -r requirements.txt

# Vérifier que l'environnement virtuel est activé
which python  # Doit pointer vers venv/bin/python
```

### Le serveur ne redémarre pas automatiquement

Si le mode `--reload` ne fonctionne pas :

1. Vérifiez que vous utilisez bien l'option `--reload`
2. Assurez-vous que les fichiers modifiés sont dans le répertoire surveillé
3. Redémarrez manuellement le serveur

## 📝 Variables d'environnement

Si votre backend nécessite des variables d'environnement (clés API, configuration, etc.), assurez-vous qu'elles sont définies avant de démarrer :

```bash
# Exemple avec un fichier .env
export $(cat .env | xargs)
./start_backend.sh

# Ou directement dans la commande
OPENAI_API_KEY=your_key uvicorn app.main:app --reload
```

## 🎯 Commandes rapides

```bash
# Démarrer (depuis le répertoire backend)
./start_backend.sh

# Arrêter
Ctrl+C

# Redémarrer
Ctrl+C puis ./start_backend.sh

# Vérifier les logs
# Les logs s'affichent directement dans le terminal
```

## 📚 Ressources

- **Documentation FastAPI** : https://fastapi.tiangolo.com/
- **Documentation Uvicorn** : https://www.uvicorn.org/
- **URL locale** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs

---

**Note :** En production, utilisez un serveur ASGI comme Gunicorn avec Uvicorn workers au lieu du mode développement avec `--reload`.
