# 📧 Explication : Intégration email pour l'envoi de devis

## 🔍 Problème actuel

L'erreur "Aucune intégration email principale configurée" apparaît quand vous essayez d'envoyer un devis par email.

## 💡 Explication

Pour envoyer des emails de devis/factures, le système utilise une **intégration email (IMAP)** configurée pour votre entreprise. Cette intégration permet :
- D'envoyer des emails depuis l'adresse email de votre entreprise
- De recevoir les réponses dans le module Inbox
- D'associer les emails envoyés aux conversations clients

## ✅ Solution : Configurer une intégration email

Vous devez configurer une intégration email dans l'application :

1. **Allez dans l'application** : `https://www.lokario.fr/app/settings`
2. **Section "Inbox"** ou **"Intégrations email"**
3. **Ajoutez une intégration email IMAP** :
   - Email de l'entreprise (ex: contact@votreentreprise.fr)
   - Mot de passe d'application ou mot de passe SMTP
   - Marquez-la comme **"principale"** (primary)

## 📋 Types d'intégrations

### Intégration IMAP (pour envoyer/recevoir)
- Permet d'envoyer des emails de devis/factures
- Permet de recevoir les emails dans le module Inbox
- Nécessite : Email + Mot de passe SMTP

### Intégration Gmail
- Si vous utilisez Gmail, utilisez un "Mot de passe d'application"
- Généré sur : https://myaccount.google.com/apppasswords

## 🔧 Configuration rapide

### Option 1 : Via l'interface (recommandé)

1. Connectez-vous à `https://www.lokario.fr`
2. Allez dans **Paramètres** → **Inbox** ou **Intégrations**
3. Ajoutez une nouvelle intégration email
4. Renseignez :
   - Email : votre email professionnel
   - Type : IMAP
   - SMTP Server : smtp.gmail.com (si Gmail) ou votre serveur SMTP
   - Mot de passe : Mot de passe d'application (Gmail) ou mot de passe SMTP
5. **Cochez "Principal"** (Primary)
6. Sauvegardez

### Option 2 : Alternative temporaire (si disponible)

Si le code est modifié pour utiliser SendGrid API comme fallback, vous pourriez utiliser l'email configuré dans `SMTP_FROM_EMAIL` (noreply@lokario.fr), mais cela n'est pas encore implémenté.

## ⚠️ Important

- L'intégration email doit être **marquée comme principale** (is_primary = true)
- Elle doit être **active** (is_active = true)
- Elle doit être de type **IMAP**

## 🎯 Après configuration

Une fois l'intégration configurée, vous pourrez :
- ✅ Envoyer des devis par email
- ✅ Envoyer des factures par email
- ✅ Recevoir les réponses dans le module Inbox
- ✅ Associer les emails aux conversations clients

## 📝 Note

Cette intégration est différente de la configuration SMTP globale (qui était pour les emails système comme la vérification de compte). Ici, il s'agit d'une intégration **par entreprise** qui permet d'envoyer des emails depuis l'adresse email professionnelle de l'entreprise.
