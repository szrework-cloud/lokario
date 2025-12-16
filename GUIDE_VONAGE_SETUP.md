# Guide d'intégration Vonage SMS

Ce guide explique comment configurer l'intégration SMS avec Vonage (anciennement Nexmo) dans votre application.

## 📋 Prérequis

1. Un compte Vonage (inscription sur https://www.vonage.com/)
2. Un numéro de téléphone Vonage configuré
3. Vos credentials API Vonage (API Key et API Secret)

## 🔑 Obtenir les credentials Vonage

1. Connectez-vous à votre [Dashboard Vonage](https://dashboard.nexmo.com/)
2. Allez dans **Settings** → **API Settings**
3. Récupérez votre **API Key** et votre **API Secret**

## ⚙️ Configuration dans l'application

### 1. Créer une intégration SMS

1. Allez dans **Paramètres** → **Intégrations Inbox**
2. Cliquez sur **Ajouter une intégration**
3. Sélectionnez **📱 SMS (Vonage)**
4. Renseignez les informations suivantes :

   - **Nom** : Ex. "SMS Vonage Principal"
   - **Numéro Vonage** : Votre numéro Vonage (format : `33612345678` ou `+33612345678`)
   - **API Key Vonage** : Votre API Key Vonage
   - **API Secret Vonage** : Votre API Secret Vonage

5. Cliquez sur **Enregistrer**

### 2. Configurer le webhook pour recevoir les SMS

Pour recevoir les SMS dans l'application, vous devez configurer un webhook dans votre Dashboard Vonage :

1. Allez dans votre [Dashboard Vonage](https://dashboard.nexmo.com/)
2. Allez dans **Settings** → **API Settings**
3. Configurez l'URL du webhook :
   ```
   http://votre-domaine.com:8000/inbox/webhooks/sms
   ```
   ou pour le développement local :
   ```
   http://localhost:8000/inbox/webhooks/sms
   ```
4. **HTTP Method** : `POST`
5. Enregistrez la configuration

## 📱 Utilisation

### Envoyer un SMS

1. Allez dans **Inbox**
2. Créez une nouvelle conversation ou répondez à une conversation SMS existante
3. Tapez votre message
4. Envoyez

Les SMS envoyés depuis l'inbox seront envoyés via votre numéro Vonage configuré.

### Recevoir des SMS

Une fois le webhook configuré, les SMS reçus sur votre numéro Vonage apparaîtront automatiquement dans l'inbox.

## 🔍 Dépannage

### Les SMS ne sont pas reçus

1. Vérifiez que le webhook est bien configuré dans votre Dashboard Vonage
2. Vérifiez que l'URL du webhook est accessible (pas de firewall bloquant)
3. Vérifiez les logs du backend pour voir les erreurs éventuelles

### Les SMS ne sont pas envoyés

1. Vérifiez que vos credentials API (API Key et API Secret) sont corrects
2. Vérifiez que votre numéro Vonage est bien configuré
3. Vérifiez que le numéro de téléphone du destinataire est au bon format (format international)

## 📚 Documentation

- [Documentation Vonage SMS](https://developer.vonage.com/en/sms/overview)
- [API Reference Vonage](https://developer.vonage.com/api/sms)

