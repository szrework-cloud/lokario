# 📧 Différence entre SMTP et IMAP (Module Inbox)

## 🔍 Question : SMTP vs Inbox Integration

Vous avez raison de demander ! Il y a **deux choses différentes** :

### 1. 📤 SMTP : Pour ENVOYER des emails depuis l'application

**À quoi ça sert :**
- ✅ Envoyer des emails de notification
- ✅ Envoyer des confirmations (inscription, commande, etc.)
- ✅ Envoyer des emails automatiques depuis votre application
- ✅ Envoyer des relances automatiques
- ✅ Envoyer des factures par email

**Quand l'application utilise SMTP :**
- Quand votre backend FastAPI doit **envoyer un email**
- Par exemple : "Votre facture est prête", "Votre compte a été créé", etc.

**Configuration :**
```
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=votre.email@gmail.com
SMTP_PASSWORD=mot_de_passe
```

### 2. 📥 IMAP : Pour LIRE les emails des utilisateurs (Module Inbox)

**À quoi ça sert :**
- ✅ Connecter le module Inbox aux boîtes email des utilisateurs
- ✅ Recevoir et lire les emails entrants
- ✅ Classer automatiquement les conversations
- ✅ Répondre aux emails

**Quand l'application utilise IMAP :**
- Quand un utilisateur configure son intégration email dans le module Inbox
- Pour lire les emails de SA boîte email personnelle

**Configuration :**
- Chaque utilisateur configure **sa propre** intégration IMAP dans l'application
- Stockée dans la table `inbox_integrations`
- L'utilisateur entre ses propres identifiants IMAP (Gmail, Outlook, etc.)

## 🎯 Résumé

| | SMTP | IMAP (Inbox) |
|---|---|---|
| **Utilisation** | Envoyer des emails | Lire les emails |
| **Qui configure** | Vous (développeur) dans Railway | Les utilisateurs dans l'app |
| **Où** | Variables Railway | Table `inbox_integrations` |
| **Exemple** | Envoyer "Votre facture" | Lire les emails du client |

## 📋 Configuration SMTP : Oui ou Non ?

### Vous DEVEZ configurer SMTP si :

✅ Vous voulez envoyer des emails automatiques :
- Confirmations d'inscription
- Notifications de nouvelles tâches
- Relances automatiques de factures
- Envoi de factures par email
- Emails de réinitialisation de mot de passe

### Vous N'AVEZ PAS besoin de SMTP si :

❌ Vous utilisez UNIQUEMENT le module Inbox pour lire les emails
❌ Vous n'envoyez JAMAIS d'emails depuis l'application
❌ Tous les emails sont gérés manuellement

## 🔍 Vérifier si votre application utilise SMTP

Cherchez dans votre code les utilisations de SMTP :
- Envoi de factures
- Envoi de relances
- Notifications par email
- Confirmations d'inscription
- Réinitialisation de mot de passe

Si vous avez ces fonctionnalités → **Vous devez configurer SMTP**

## 📝 Exemple concret

### Scénario 1 : Envoi de facture
```
Utilisateur crée une facture → Application utilise SMTP → Email envoyé au client
```
→ **SMTP nécessaire**

### Scénario 2 : Module Inbox
```
Client envoie un email → Utilisateur configure IMAP → Application lit l'email via IMAP
```
→ **Pas besoin de SMTP pour ça** (besoin d'IMAP, configuré par l'utilisateur)

## ✅ Conclusion

- **SMTP** = Configuration globale dans Railway pour ENVOYER des emails depuis l'app
- **IMAP** = Configuration par utilisateur dans l'app pour LIRE leurs emails (module Inbox)

**Si vous n'envoyez jamais d'emails automatiquement depuis l'application, vous n'avez pas besoin de configurer SMTP !**
