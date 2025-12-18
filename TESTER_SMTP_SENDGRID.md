# 🧪 Tester la configuration SMTP SendGrid

## 📋 Script de test

Un script de test a été créé pour diagnostiquer les problèmes SMTP : `backend/scripts/test_sendgrid_smtp.py`

## 🚀 Comment utiliser le script

### Option 1 : Depuis votre machine locale (si vous avez accès à Railway Variables)

```bash
cd backend
python scripts/test_sendgrid_smtp.py
```

**Note :** Assurez-vous d'avoir les variables d'environnement configurées (copiez-les depuis Railway).

### Option 2 : Depuis Railway (Recommandé)

1. **Railway Dashboard** → Votre service backend → **"Deployments"**
2. Cliquez sur le dernier déploiement
3. Onglet **"Logs"** ou **"Shell"**
4. Ou utilisez Railway CLI :

```bash
railway run python scripts/test_sendgrid_smtp.py
```

### Option 3 : Via Railway CLI

```bash
# Se connecter à Railway
railway login

# Lier le projet
railway link

# Exécuter le script
railway run python backend/scripts/test_sendgrid_smtp.py
```

## 🔍 Ce que le script teste

1. **Configuration SMTP**
   - Affiche toutes les variables SMTP configurées
   - Vérifie que les valeurs sont présentes

2. **Connexion SMTP**
   - Teste la connexion à `smtp.sendgrid.net`
   - Vérifie le port (587 ou 465)
   - Teste l'authentification avec l'API Key

3. **Envoi d'email** (optionnel)
   - Envoie un email de test
   - Permet de vérifier que l'envoi fonctionne

## 📊 Résultats attendus

### ✅ Si tout fonctionne :

```
✅ Connexion SMTP établie
✅ Authentification réussie
✅ Email envoyé avec succès
```

### ❌ Si problème d'authentification :

```
❌ Erreur d'authentification SMTP
💡 Vérifiez:
   - Que SMTP_USERNAME = 'apikey' (en minuscules)
   - Que SMTP_PASSWORD contient votre API Key SendGrid complète
```

### ❌ Si problème de connexion :

```
❌ Erreur de connexion
💡 Vérifiez:
   - Que SMTP_HOST = smtp.sendgrid.net
   - Que le port 587 est accessible depuis Railway
```

## 🔧 Si le script ne fonctionne pas

1. **Vérifiez que les variables Railway sont bien configurées :**
   ```
   SMTP_HOST = smtp.sendgrid.net
   SMTP_PORT = 587
   SMTP_USE_TLS = true
   SMTP_USERNAME = apikey
   SMTP_PASSWORD = votre_api_key_complete
   SMTP_FROM_EMAIL = noreply@lokario.fr
   ```

2. **Vérifiez les logs Railway** pour voir les erreurs exactes

3. **Vérifiez que l'API Key SendGrid est valide** dans SendGrid Dashboard

## 📝 Exécution manuelle simple

Si vous voulez tester rapidement depuis Railway, vous pouvez aussi exécuter directement dans un shell Railway :

```python
from app.core.config import settings
print(f"SMTP_HOST: {settings.SMTP_HOST}")
print(f"SMTP_PORT: {settings.SMTP_PORT}")
print(f"SMTP_USERNAME: {settings.SMTP_USERNAME}")
print(f"SMTP_PASSWORD configuré: {bool(settings.SMTP_PASSWORD)}")
```
