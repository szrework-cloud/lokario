# 🔍 Debug : Email ne s'envoie pas - Logs détaillés ajoutés

## 🔍 Problème identifié

Vous avez mentionné :
- ❌ Pas de logs indiquant qu'un email a été envoyé au premier essai
- ⏰ Il faut attendre longtemps
- ❌ Ensuite ça dit que ça n'a pas marché

## ✅ Logs détaillés ajoutés

J'ai ajouté des logs détaillés à **chaque étape** du processus d'envoi d'email pour diagnostiquer le problème.

### Logs dans l'inscription

```
📧 [REGISTER] Ajout de la tâche d'envoi d'email de vérification en arrière-plan pour: user@example.com
📧 [REGISTER] Token: abc123...
📧 [REGISTER] Tâche d'envoi d'email ajoutée avec succès (exécution en arrière-plan)
```

### Logs dans l'envoi d'email

```
📧 [EMAIL] Début de l'envoi d'email de vérification à user@example.com
📧 [EMAIL] Connexion à smtp.sendgrid.net:587...
📧 [EMAIL] Utilisation du port 587 (STARTTLS)
📧 [EMAIL] Activation de STARTTLS...
📧 [EMAIL] STARTTLS activé
📧 [EMAIL] Authentification avec apikey...
📧 [EMAIL] Authentification réussie
📧 [EMAIL] Envoi du message...
📧 [EMAIL] Message envoyé avec succès
✅ Email de vérification envoyé avec succès à user@example.com
```

## 🔍 Ce qu'il faut vérifier maintenant

Après déploiement, testez à nouveau et **regardez les logs Railway** :

### 1. Vérifiez que la tâche est bien ajoutée

Cherchez dans les logs :
```
📧 [REGISTER] Ajout de la tâche d'envoi d'email...
📧 [REGISTER] Tâche d'envoi d'email ajoutée avec succès
```

Si vous **ne voyez pas** ces logs → La tâche n'est pas ajoutée (problème avec BackgroundTasks)

### 2. Vérifiez que l'email commence à s'envoyer

Cherchez dans les logs :
```
📧 [EMAIL] Début de l'envoi d'email de vérification...
```

Si vous **ne voyez pas** ce log → La fonction `send_verification_email` n'est jamais appelée

### 3. Vérifiez où ça bloque

Si vous voyez `📧 [EMAIL] Début...` mais pas `📧 [EMAIL] Message envoyé avec succès`, regardez le dernier log avant l'erreur :

- `📧 [EMAIL] Connexion à...` → Bloque sur la connexion SMTP
- `📧 [EMAIL] Authentification...` → Bloque sur l'authentification
- `📧 [EMAIL] Envoi du message...` → Bloque sur l'envoi

### 4. Vérifiez les erreurs

Cherchez dans les logs :
```
❌ Erreur...
```

## 🎯 Diagnostic possible

### Scénario 1 : Pas de logs `[EMAIL]` du tout

**Cause :** La fonction `send_verification_email` n'est jamais exécutée par BackgroundTasks

**Solution :** Problème avec BackgroundTasks de FastAPI (peut-être un problème de configuration)

### Scénario 2 : Logs `[EMAIL] Début` mais bloque sur connexion

**Cause :** Problème de connexion réseau à SendGrid

**Solution :** 
- Vérifiez que le port 587 n'est pas bloqué
- Essayez le port 465 avec SSL

### Scénario 3 : Bloque sur authentification

**Cause :** Problème avec l'API Key SendGrid

**Solution :**
- Vérifiez que `SMTP_USERNAME = apikey` (exactement)
- Vérifiez que l'API Key est valide dans SendGrid Dashboard

### Scénario 4 : Timeout après longtemps

**Cause :** Le timeout de 30 secondes n'est pas suffisant ou SendGrid répond lentement

**Solution :** Augmenter le timeout ou vérifier les performances réseau

## 📋 Action immédiate

1. **Déployez** le code avec les nouveaux logs
2. **Testez** la création d'un compte
3. **Regardez les logs Railway** en temps réel
4. **Identifiez** où ça bloque en regardant les logs `📧 [EMAIL]`
5. **Partagez** les logs avec moi pour diagnostic précis

## 🔧 Si BackgroundTasks ne fonctionne pas

Si les logs montrent que la tâche est ajoutée mais jamais exécutée, on pourra passer à une solution alternative (queue avec Celery ou envoi synchrone avec timeout plus court).
