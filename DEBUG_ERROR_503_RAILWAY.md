# 🔍 Debug : Erreur 503 sur Railway Backend

## 🔴 Symptôme
```
lokario-production.up.railway.app/auth/register:1
Failed to load resource: the server responded with a status of 503 ()
```

**503 = Service Unavailable** - Le backend n'est pas accessible.

## 🔍 Causes possibles

### 1. Backend non démarré / Crash au démarrage

**Vérifier les logs Railway :**

1. Aller sur [railway.app](https://railway.app)
2. Ouvrir votre service de production
3. Aller dans **"Logs"** ou **"Deployments"**
4. Vérifier les dernières lignes de logs

**Erreurs courantes à chercher :**
- `ImportError` ou `ModuleNotFoundError`
- Erreurs de connexion à la base de données
- `JWT_SECRET_KEY` manquant ou invalide
- Variables d'environnement manquantes
- Port déjà utilisé

### 2. Variables d'environnement manquantes

**Vérifier dans Railway → Variables :**

Variables critiques requises :
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET_KEY`
- ✅ `ENVIRONMENT=production`
- ✅ `FRONTEND_URL`
- ✅ Variables optionnelles mais recommandées :
  - `VONAGE_API_KEY` / `VONAGE_API_SECRET`
  - `ENCRYPTION_MASTER_KEY`
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `SMTP_*` ou `SENDGRID_API_KEY`

### 3. Erreur de connexion à la base de données

**Symptômes dans les logs :**
```
psycopg2.OperationalError: could not connect to server
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError)
```

**Solutions :**
- Vérifier que `DATABASE_URL` est correct
- Vérifier que la base de données Supabase est accessible
- Vérifier les règles de pare-feu Supabase

### 4. Le service est en train de redémarrer

**Attendre quelques minutes** - Railway peut prendre 1-5 minutes pour démarrer.

### 5. Build failed / Déploiement échoué

**Vérifier dans Railway :**
- **Deployments** → Vérifier le statut du dernier déploiement
- Si **"Failed"** → Cliquer pour voir les logs d'erreur

## ✅ Checklist de diagnostic

1. **Vérifier les logs Railway** :
   - [ ] Ouvrir Railway → Service Production → Logs
   - [ ] Chercher les erreurs en rouge
   - [ ] Vérifier les dernières lignes de logs

2. **Vérifier le statut du service** :
   - [ ] Le service est-il "Running" ?
   - [ ] Y a-t-il un déploiement en cours ?
   - [ ] Le dernier déploiement a-t-il réussi ?

3. **Vérifier les variables d'environnement** :
   - [ ] `DATABASE_URL` est configuré
   - [ ] `JWT_SECRET_KEY` est configuré et différent de staging
   - [ ] `ENVIRONMENT=production`
   - [ ] `FRONTEND_URL` est configuré

4. **Tester la connexion à la base de données** :
   - [ ] La base de données Supabase est accessible
   - [ ] Le `DATABASE_URL` est correct

## 🚀 Solutions rapides

### Solution 1 : Redémarrer le service

1. **Railway** → Service Production
2. Cliquer sur les **"..."** (3 points)
3. **Restart**

### Solution 2 : Vérifier et corriger les variables d'environnement

1. **Railway** → Service Production → **Variables**
2. Vérifier que toutes les variables critiques sont présentes
3. Si manquantes, les ajouter

### Solution 3 : Vérifier les logs et corriger l'erreur

1. **Railway** → Service Production → **Logs**
2. Identifier l'erreur spécifique
3. Corriger la cause (variable manquante, erreur de code, etc.)

### Solution 4 : Redéployer

1. **Railway** → Service Production → **Deployments**
2. Cliquer sur **"..."** du dernier déploiement
3. **Redeploy**

## 📋 Logs à vérifier

**Logs normaux au démarrage :**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:PORT
```

**Si vous voyez des erreurs, notez-les et corrigez-les.**

## 🆘 Erreurs courantes et solutions

### Erreur : `JWT_SECRET_KEY` manquant
```
ValueError: 🚨 SÉCURITÉ: JWT_SECRET_KEY ne peut pas utiliser la valeur par défaut en production
```
**Solution** : Ajouter `JWT_SECRET_KEY` dans Railway → Variables

### Erreur : Connexion base de données
```
psycopg2.OperationalError: could not connect to server
```
**Solution** : Vérifier `DATABASE_URL` dans Railway → Variables

### Erreur : Module manquant
```
ModuleNotFoundError: No module named 'xxx'
```
**Solution** : Vérifier que `requirements.txt` contient toutes les dépendances

### Erreur : Port déjà utilisé
```
Address already in use
```
**Solution** : Railway gère automatiquement le port via `$PORT`, normalement pas de problème

## 📝 Prochaines étapes

1. **Ouvrir Railway** → Service Production → **Logs**
2. **Copier les dernières erreurs** (les lignes en rouge)
3. **Corriger selon l'erreur spécifique**
4. **Redémarrer le service** si nécessaire

