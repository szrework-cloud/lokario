# 🔍 Résolution de l'erreur "Failed to fetch"

## ❌ Erreur : "Failed to fetch"

Cette erreur peut survenir à plusieurs endroits. Identifiez d'abord où elle apparaît :

### 📍 1. Dans Railway Dashboard (lors du déploiement)

**Symptôme** : L'interface Railway affiche "Failed to fetch" lors de la configuration

**Solutions** :
- Vérifier votre connexion internet
- Rafraîchir la page (F5)
- Se déconnecter et se reconnecter à Railway
- Vérifier que GitHub est accessible depuis Railway

---

### 📍 2. Dans le navigateur (lors de l'accès à l'API)

**Symptôme** : Erreur "Failed to fetch" dans la console du navigateur lors de l'appel API

**Causes possibles** :

#### A. Problème CORS

**Symptôme** : L'erreur apparaît dans la console avec un message CORS

**Solution** : Ajouter l'URL Railway dans les origines autorisées

1. Récupérer l'URL de votre backend Railway (ex: `https://backend-production-xxxx.up.railway.app`)
2. Ajouter cette URL dans la configuration CORS

Dans `backend/app/main.py`, modifier :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
        "https://votre-backend.railway.app",  # ← AJOUTER ICI
    ]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://votre-backend.railway.app",  # ← AJOUTER ICI AUSSI pour les tests
    ]
```

#### B. Backend non démarré

**Vérification** :
1. Ouvrir l'URL Railway directement : `https://votre-backend.railway.app/docs`
2. Si vous voyez la documentation Swagger → Backend OK
3. Si erreur 502/503 → Backend ne démarre pas

**Solution** :
- Vérifier les logs Railway
- Vérifier que toutes les variables d'environnement sont définies
- Vérifier que le Procfile est correct

#### C. URL API incorrecte

**Vérification** :
- Dans le frontend, vérifier que `NEXT_PUBLIC_API_URL` pointe vers la bonne URL
- L'URL doit être celle de Railway (pas localhost en production)

---

### 📍 3. Problème de connexion réseau

**Solutions** :
- Vérifier votre connexion internet
- Vérifier que Railway est accessible : https://status.railway.app
- Essayer depuis un autre réseau
- Vérifier les pare-feu/proxy

---

## 🔧 Solutions rapides

### Solution 1 : Autoriser toutes les origines temporairement (pour tests)

⚠️ **ATTENTION** : À utiliser uniquement pour les tests !

Dans `backend/app/main.py`, remplacer temporairement :

```python
# TEMPORAIRE - Pour les tests uniquement
origins = ["*"]
```

Puis redéployer sur Railway.

### Solution 2 : Ajouter l'URL Railway dans CORS

1. Récupérer l'URL exacte de votre backend Railway
2. Modifier `backend/app/main.py` comme indiqué ci-dessus
3. Commiter et pusher les changements
4. Railway redéploiera automatiquement

### Solution 3 : Vérifier les logs Railway

1. Dans Railway Dashboard → Deployments
2. Cliquer sur le dernier déploiement
3. Voir les logs pour identifier l'erreur exacte
4. Chercher les erreurs de démarrage, de connexion DB, etc.

---

## ✅ Checklist de diagnostic

- [ ] Backend Railway déployé et accessible via `/docs`
- [ ] Variables d'environnement toutes définies dans Railway
- [ ] URL Railway ajoutée dans la configuration CORS
- [ ] `NEXT_PUBLIC_API_URL` pointe vers l'URL Railway (pas localhost)
- [ ] Logs Railway ne montrent pas d'erreurs
- [ ] Backend répond bien aux requêtes (tester avec `/docs`)

---

## 🚀 Solution recommandée

1. **Récupérer l'URL Railway** de votre backend
2. **Modifier la configuration CORS** pour inclure cette URL
3. **Pousser les changements** sur GitHub
4. **Vérifier que Railway redéploie** automatiquement
5. **Tester** avec l'URL `/docs` puis depuis le frontend
