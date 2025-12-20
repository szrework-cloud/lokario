# Créer le compte admin en production

## 🚀 Méthode 1 : Via l'endpoint API (LE PLUS SIMPLE)

**Dans votre terminal local, exécutez :**

```bash
curl -X POST "https://lokario-production.up.railway.app/auth/create-admin?secret=change-me-in-production"
```

**Réponse attendue :**
```json
{
  "message": "Admin account created",
  "email": "admin@lokario.fr",
  "password": "Admin123!",
  "role": "super_admin",
  "id": 9
}
```

✅ **C'est tout !** Le compte est créé directement en production.

---

## 🔧 Méthode 2 : Via Railway CLI (si vous avez Railway CLI installé)

### 1. Installer Railway CLI (si pas déjà fait)

```bash
npm i -g @railway/cli
railway login
```

### 2. Se connecter à votre projet

```bash
railway link
# Sélectionner votre projet
```

### 3. Exécuter le script

```bash
railway run python3 backend/scripts/create_admin_production.py
```

---

## 🖥️ Méthode 3 : Via Railway Shell (Console web)

### 1. Aller sur Railway Dashboard

1. Ouvrez https://railway.app
2. Sélectionnez votre projet
3. Cliquez sur votre service backend
4. Onglet **"Deployments"** → Cliquez sur le dernier déploiement
5. Cliquez sur **"Shell"** ou **"Console"**

### 2. Exécuter le script

Dans le shell Railway, exécutez :

```bash
cd /app
python3 scripts/create_admin_production.py
```

---

## 📝 Méthode 4 : Via Railway One-Off Command

### Sur Railway Dashboard :

1. **Service** → **Settings** → **Deploy**
2. Dans **"One-Off Command"** (si disponible), entrez :
   ```
   python3 scripts/create_admin_production.py
   ```
3. Exécutez la commande

---

## ✅ Vérification

Après avoir créé le compte, testez la connexion :

**Email** : `admin@lokario.fr`  
**Mot de passe** : `Admin123!`

---

## 🔒 Sécuriser l'endpoint (Optionnel)

Pour sécuriser l'endpoint `/auth/create-admin` :

1. **Sur Railway → Variables → Ajouter :**
   ```
   ADMIN_CREATE_SECRET=votre-secret-tres-securise-123
   ```

2. **Utiliser le secret dans le curl :**
   ```bash
   curl -X POST "https://lokario-production.up.railway.app/auth/create-admin?secret=votre-secret-tres-securise-123"
   ```

---

## 🎯 Recommandation

**Utilisez la Méthode 1 (endpoint API)** - c'est le plus simple et le plus rapide !

Juste exécutez le curl depuis votre terminal local, et le compte sera créé directement en production.
