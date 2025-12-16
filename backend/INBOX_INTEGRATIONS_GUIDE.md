# Guide d'intégration Inbox - Réception des messages

Ce guide explique comment configurer la réception des messages (email, WhatsApp, Messenger) dans le module Inbox.

## 📧 Email

### Option 1 : Webhook (Recommandé pour production)

Les services d'email comme **SendGrid**, **Mailgun**, **Postmark** peuvent envoyer les emails reçus vers un webhook.

**Endpoint webhook :**
```
POST http://votre-backend.com/inbox/webhooks/email
```

**Format du payload :**
```json
{
  "from": {
    "email": "client@example.com",
    "name": "Nom du client"
  },
  "to": "entreprise@lokario.fr",
  "subject": "Sujet de l'email",
  "content": "Contenu texte",
  "html_content": "<p>Contenu HTML</p>",
  "attachments": [
    {
      "name": "fichier.pdf",
      "content": "base64_encoded_content",
      "mime_type": "application/pdf"
    }
  ],
  "message_id": "unique_id",
  "company_code": "123456"
}
```

**Configuration SendGrid :**
1. Aller dans Settings > Inbound Parse
2. Configurer le webhook vers : `https://votre-backend.com/inbox/webhooks/email`
3. Ajouter le `company_code` dans les headers ou le payload

### Option 2 : IMAP (Pour boîtes mail personnelles)

Le backend peut se connecter directement à une boîte mail via IMAP pour récupérer les emails.

**Endpoint de synchronisation :**
```
POST /inbox/integrations/imap/sync
```

**Paramètres :**
- `imap_server`: smtp.gmail.com, imap.gmail.com, etc.
- `imap_port`: 993 (SSL) ou 143 (non-SSL)
- `email_address`: L'adresse email
- `password`: Le mot de passe ou app password
- `use_ssl`: true/false
- `company_code`: Le code de l'entreprise (auto-détecté depuis l'utilisateur)

**Test de connexion :**
```
GET /inbox/integrations/imap/test?imap_server=...&imap_port=...&email_address=...&password=...
```

**Note :** Pour Gmail, il faut utiliser un "App Password" au lieu du mot de passe normal.

## 📱 WhatsApp

### Configuration WhatsApp Business API

1. Créer un compte WhatsApp Business API (via Twilio, MessageBird, etc.)
2. Configurer le webhook vers :
```
POST https://votre-backend.com/inbox/webhooks/whatsapp
```

**Format du payload :**
```json
{
  "from": {
    "phone": "+33612345678",
    "name": "Nom du client"
  },
  "to": "+33123456789",
  "message": "Contenu du message",
  "message_id": "whatsapp_message_id",
  "company_code": "123456"
}
```

## 💬 Facebook Messenger

### Configuration Messenger

1. Créer une app Facebook
2. Configurer le webhook dans Facebook Developer Console
3. URL du webhook : `https://votre-backend.com/inbox/webhooks/messenger`
4. Token de vérification : Configurer `MESSENGER_VERIFY_TOKEN` dans `.env`

**Format du payload :**
```json
{
  "from": {
    "id": "facebook_user_id",
    "name": "Nom du client"
  },
  "message": "Contenu du message",
  "message_id": "messenger_message_id",
  "company_code": "123456"
}
```

## 🔒 Sécurité

### Vérification des webhooks

Pour sécuriser les webhooks, configurez `WEBHOOK_SECRET` dans `.env` :

```env
WEBHOOK_SECRET=votre_secret_securise
```

Le backend vérifiera automatiquement la signature des webhooks.

## 🚀 Prochaines étapes

1. **Cron job pour IMAP** : Créer un script qui synchronise automatiquement les emails toutes les X minutes
2. **Queue system** : Utiliser Celery ou similaire pour traiter les webhooks de manière asynchrone
3. **Classification IA** : Ajouter la classification automatique des messages dans les dossiers
4. **Auto-réponse** : Implémenter les réponses automatiques configurées

