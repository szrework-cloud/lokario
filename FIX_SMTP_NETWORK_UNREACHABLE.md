# 🔧 Fix : Erreur "Network is unreachable" SMTP sur Railway

## 🔍 Problème

```
OSError: [Errno 101] Network is unreachable
```

Railway ne peut pas se connecter à `smtp.gmail.com:587`. Cela peut être dû à :

1. **Restrictions réseau Railway** (certains ports peuvent être bloqués)
2. **Problème de résolution DNS**
3. **Port 587 bloqué** (certains hébergeurs bloquent les ports non-standard)

## ✅ Solutions

### Solution 1 : Utiliser le port 465 avec SSL (Recommandé)

Le port **465** utilise SSL directement (plus stable sur Railway) au lieu de TLS sur le port 587.

**Configuration Railway Variables :**
- `SMTP_PORT` = `465`
- `SMTP_USE_TLS` = `false` (car on utilise SSL directement)

Puis modifier le code pour utiliser `SMTP_SSL` au lieu de `SMTP` + `starttls()`.

### Solution 2 : Utiliser SendGrid (Alternative recommandée)

SendGrid est mieux supporté sur les plateformes cloud et offre :
- ✅ API REST (pas de problème de réseau)
- ✅ Meilleure délivrabilité
- ✅ 100 emails/jour gratuits
- ✅ Pas de problème de port/firewall

**Configuration SendGrid :**
1. Créer un compte sur https://sendgrid.com
2. Générer une API Key
3. Variables Railway :
   - `SMTP_HOST` = `smtp.sendgrid.net`
   - `SMTP_PORT` = `587` ou `465`
   - `SMTP_USERNAME` = `apikey`
   - `SMTP_PASSWORD` = `votre_api_key_sendgrid`
   - `SMTP_FROM_EMAIL` = votre email vérifié sur SendGrid

### Solution 3 : Utiliser Resend (Moderne, simple)

Resend offre une API moderne et simple :
- ✅ API REST simple
- ✅ 100 emails/jour gratuits
- ✅ Excellent pour les applications modernes

**Configuration :**
- Utiliser leur SDK Python : `pip install resend`
- Pas besoin de SMTP classique

### Solution 4 : Timeout et retry

Ajouter des timeouts et retry logic pour gérer les problèmes réseau temporaires.

## 🎯 Recommandation immédiate

**Option A : Port 465 avec SSL** (si vous voulez garder Gmail)
- Modifier le code pour utiliser `SMTP_SSL` au lieu de `SMTP` + `starttls()`
- Changer `SMTP_PORT` à `465` et `SMTP_USE_TLS` à `false`

**Option B : SendGrid** (meilleure pour production)
- Plus fiable sur Railway
- Meilleure délivrabilité
- Pas de problème de réseau

## 📝 Prochaines étapes

1. Si vous choisissez **Option A** : Je modifie le code pour supporter SSL direct (port 465)
2. Si vous choisissez **Option B** : Je vous guide pour configurer SendGrid

Quelle option préférez-vous ?
