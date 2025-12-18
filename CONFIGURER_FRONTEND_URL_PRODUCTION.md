# 🌐 Configurer FRONTEND_URL pour la production

## 🔍 Problème

Les liens de vérification d'email utilisent `http://localhost:3000` au lieu de l'URL de production `https://www.lokario.fr`.

## ✅ Solution : Configurer FRONTEND_URL dans Railway

### Variable Railway à ajouter

Dans Railway → Variables, ajoutez :

```
FRONTEND_URL = https://www.lokario.fr
```

## 📋 Configuration complète Railway Variables

Pour que tout fonctionne en production, assurez-vous d'avoir :

```
# SendGrid API
SENDGRID_API_KEY = votre_api_key_sendgrid

# Frontend URL
FRONTEND_URL = https://www.lokario.fr

# Email
SMTP_FROM_EMAIL = noreply@lokario.fr
```

## 🔍 Vérification

Après configuration, les liens de vérification seront :
- ✅ `https://www.lokario.fr/verify-email/{token}`
- ❌ Plus `http://localhost:3000/verify-email/{token}`

## 📝 Note

Si `FRONTEND_URL` n'est pas configuré dans Railway, le code utilisera la valeur par défaut `http://localhost:3000` (configurée dans `config.py`).

Pour la production, **vous devez absolument** configurer `FRONTEND_URL` dans Railway.
