# 📋 Comment voir les logs Railway

## 🔍 Accès aux logs

### Option 1 : Via le Dashboard Railway (recommandé)

1. **Allez sur Railway Dashboard**
   - https://railway.app/dashboard

2. **Sélectionnez votre projet**
   - Cliquez sur le projet qui contient votre backend

3. **Ouvrez le service backend**
   - Cliquez sur le service (ex: "production" ou nom de votre service)

4. **Onglet "Logs"**
   - Dans le menu de gauche, cliquez sur **"Logs"**
   - Ou utilisez l'onglet en haut : **"Logs"**

5. **Voir les logs en temps réel**
   - Les logs apparaissent en temps réel
   - Ils sont automatiquement mis à jour
   - Vous pouvez faire défiler vers le haut pour voir les anciens logs

### Option 2 : Via Railway CLI

Si vous avez Railway CLI installé :

```bash
# Se connecter à Railway
railway login

# Lier le projet
railway link

# Voir les logs en temps réel
railway logs

# Voir les logs avec filtrage
railway logs --follow
```

## 🔎 Ce que vous devez chercher dans les logs

### Lors de la création d'un compte

Quand vous créez un compte, vous devriez voir :

#### Si SMTP n'est PAS configuré :
```
================================================================================
📧 [MOCK EMAIL] Email de vérification
================================================================================
Destinataire: votre@email.com
Token de vérification: abc123...
Lien de vérification: https://lokario.fr/verify-email/abc123...
================================================================================
```

#### Si SMTP est configuré MAIS erreur d'authentification :
```
❌ Erreur d'authentification SMTP: (535, '5.7.8 Username and Password not accepted')
💡 Vérifiez:
   - Que vous utilisez un 'Mot de passe d'application' Gmail (pas votre mot de passe normal)
   - Que l'authentification à 2 facteurs est activée sur le compte Gmail
   - Que le mot de passe dans .env est correct (sans espaces)
   - Allez sur https://myaccount.google.com/apppasswords pour générer un nouveau mot de passe
```

#### Si SMTP fonctionne (pas de message d'erreur) :
```
POST /auth/register 200 OK
```

**Si vous ne voyez AUCUN message**, cela signifie que l'email a été envoyé avec succès ! ✅

Vérifiez votre dossier spam.

### Lors d'une requête SMTP réussie

Vous devriez voir :
```
POST /auth/register
INFO:     127.0.0.1:xxxxx - "POST /auth/register HTTP/1.1" 200 OK
```

**Pas de message d'erreur** = Email envoyé avec succès ! 🎉

## 🔧 Problème : Pas de logs qui apparaissent ?

### Vérifications

1. **Le service est-il démarré ?**
   - Railway Dashboard → Service → Vérifiez que le statut est "Running"

2. **Avez-vous fait une requête récemment ?**
   - Créez un compte de test pour déclencher les logs

3. **Les logs sont-ils filtrés ?**
   - Vérifiez qu'il n'y a pas de filtre actif dans l'interface Railway

4. **Redémarrez le service**
   - Railway Dashboard → Service → "Redeploy" ou "Restart"

## 📝 Astuce : Filtrer les logs

Dans Railway Logs, vous pouvez :
- **Chercher** : Utilisez Ctrl+F (Cmd+F sur Mac) pour chercher "SMTP", "email", "MOCK", "erreur"
- **Filtrer par niveau** : Railway affiche généralement tous les niveaux (INFO, ERROR, etc.)

## 🎯 Résumé

1. Railway Dashboard → Projet → Service → **Logs**
2. Créez un compte de test
3. Cherchez `[MOCK EMAIL]` ou `❌ Erreur`
4. Si vous ne voyez rien = Email envoyé ! ✅
