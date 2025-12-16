# Guide d'Intégration SMS/Téléphone avec Twilio

Ce guide explique comment configurer et utiliser l'intégration SMS avec Twilio dans votre application.

## 📋 Prérequis

1. **Compte Twilio** : Créez un compte sur [Twilio.com](https://www.twilio.com)
2. **Numéro Twilio** : Achetez un numéro de téléphone SMS sur Twilio
3. **Credentials** :
   - Account SID
   - Auth Token
   - Numéro Twilio (format: +33612345678)

---

## 🔧 Configuration Backend

### 1. Installer la dépendance Twilio

La dépendance est déjà ajoutée dans `requirements.txt`. Installez-la :

```bash
cd backend
pip install -r requirements.txt
```

### 2. Variables d'environnement (optionnel)

Vous pouvez ajouter des credentials Twilio globaux dans `.env` :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33612345678
```

**Note** : Ces variables globales ne sont pas utilisées actuellement. Les credentials sont stockés directement dans chaque intégration.

---

## 📱 Configuration d'une Intégration SMS

### 1. Créer l'intégration via l'API

Pour l'instant, créez l'intégration SMS via l'API directement (l'interface sera ajoutée plus tard).

**Endpoint** : `POST /inbox/integrations`

```json
{
  "name": "SMS Twilio Principal",
  "integration_type": "sms",
  "account_id": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // Twilio Account SID
  "api_key": "your_auth_token_here",                    // Twilio Auth Token
  "phone_number": "+33612345678",                       // Numéro Twilio
  "is_active": true
}
```

**Champs à utiliser dans `InboxIntegration` :**
- `integration_type` : `"sms"`
- `account_id` : Account SID Twilio
- `api_key` : Auth Token Twilio (stocké dans `api_key`)
- `phone_number` : Numéro Twilio d'envoi
- `is_active` : `true`

### 2. Configurer le Webhook Twilio

1. Connectez-vous à votre [Console Twilio](https://console.twilio.com/)
2. Allez dans **Phone Numbers** > **Manage** > **Active numbers**
3. Cliquez sur votre numéro SMS
4. Dans **Messaging**, configurez le webhook :
   - **A MESSAGE COMES IN** : `https://votre-domaine.com/inbox/webhooks/sms`
   - Méthode : `HTTP POST`

---

## 📥 Réception de SMS

### Webhook

Le webhook est déjà configuré à : `POST /inbox/webhooks/sms`

**Format Twilio** (form-data) :
- `From` : Numéro expéditeur (+33612345678)
- `To` : Numéro Twilio destinataire
- `Body` : Contenu du message
- `MessageSid` : ID unique du message
- `AccountSid` : Account SID Twilio

Le système :
1. ✅ Trouve l'intégration SMS correspondante
2. ✅ Crée ou trouve le client par téléphone
3. ✅ Crée ou trouve la conversation SMS
4. ✅ Crée le message dans l'inbox
5. ✅ Classifie automatiquement le statut

---

## 📤 Envoi de SMS depuis l'Inbox

### 1. Répondre à une conversation SMS existante

Quand vous répondez à une conversation SMS depuis l'inbox :
- Le message est automatiquement envoyé via Twilio
- Le SID Twilio est stocké dans `external_id`
- Le statut est mis à jour automatiquement

### 2. Créer une nouvelle conversation SMS

Quand vous créez une nouvelle conversation avec `source: "sms"` :
- Si le premier message est envoyé par l'entreprise (`is_from_client: false`)
- Le SMS est automatiquement envoyé via Twilio

---

## 🔍 Utilisation du modèle InboxIntegration pour SMS

Le modèle `InboxIntegration` utilise déjà les champs existants pour SMS :

| Champ InboxIntegration | Utilisation SMS |
|------------------------|-----------------|
| `integration_type` | `"sms"` |
| `account_id` | Twilio Account SID |
| `api_key` | Twilio Auth Token |
| `phone_number` | Numéro Twilio d'envoi |
| `is_active` | Active/Désactive l'intégration |

**Exemple de création d'intégration SMS :**

```python
sms_integration = InboxIntegration(
    company_id=1,
    name="SMS Twilio Principal",
    integration_type="sms",
    account_id="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  # Account SID
    api_key="your_auth_token",                        # Auth Token
    phone_number="+33612345678",                      # Numéro Twilio
    is_active=True
)
```

---

## 🧪 Test de l'intégration

### 1. Tester la réception

1. Envoyez un SMS à votre numéro Twilio depuis votre téléphone
2. Vérifiez que le message apparaît dans l'inbox
3. Vérifiez les logs backend pour voir le traitement

### 2. Tester l'envoi

1. Créez une conversation SMS dans l'inbox
2. Répondez à cette conversation
3. Vérifiez que le SMS est bien reçu sur votre téléphone
4. Vérifiez les logs backend

---

## 📝 Logs et Debug

Les logs sont affichés dans la console backend :

```
[SMS] Envoi SMS de +33612345678 vers +33698765432
[SMS] SMS envoyé avec succès: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
[SMS WEBHOOK] Message reçu et traité: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
[INBOX] Envoi du SMS via Twilio de +33612345678 à +33698765432
```

---

## ⚙️ Normalisation des numéros

Le service SMS normalise automatiquement les numéros :

- `0612345678` → `+33612345678` (France)
- `+33612345678` → `+33612345678` (déjà au bon format)
- `33612345678` → `+33612345678` (ajoute le +)

**Note** : Par défaut, si le numéro commence par `0`, il est converti en `+33` (France).

---

## 🚨 Erreurs courantes

### 1. "Account SID ou Auth Token invalide"
- Vérifiez vos credentials Twilio dans la console
- Vérifiez que `account_id` = Account SID (commence par `AC`)
- Vérifiez que `api_key` = Auth Token

### 2. "Numéro invalide"
- Les numéros doivent être au format international avec `+`
- Format attendu : `+33612345678`

### 3. "Webhook non reçu"
- Vérifiez l'URL du webhook dans Twilio
- Vérifiez que votre serveur est accessible publiquement
- Utilisez ngrok pour le développement local :
  ```bash
  ngrok http 8000
  ```
  Puis configurez le webhook Twilio avec l'URL ngrok

### 4. "SMS non reçu"
- Vérifiez les logs backend pour voir les erreurs
- Vérifiez que le numéro Twilio est bien configuré
- Vérifiez votre compte Twilio pour les erreurs d'envoi

---

## 📚 Ressources

- [Documentation Twilio SMS](https://www.twilio.com/docs/sms)
- [Twilio Console](https://console.twilio.com/)
- [Webhook Twilio](https://www.twilio.com/docs/messaging/guides/webhook-request)

---

## ✅ Checklist d'implémentation

- [x] Service SMS créé (`backend/app/core/sms_service.py`)
- [x] Webhook de réception ajouté (`/inbox/webhooks/sms`)
- [x] Envoi depuis l'inbox implémenté
- [x] Normalisation des numéros
- [x] Gestion des erreurs
- [x] Logs de debug
- [ ] Interface de configuration dans les paramètres (à venir)
- [ ] Support des médias (images, etc.) (à venir)

---

## 🎯 Prochaines étapes

1. **Interface de configuration** : Ajouter un formulaire dans les paramètres pour configurer l'intégration SMS
2. **Support des médias** : Permettre d'envoyer/recevoir des images via SMS
3. **Statut de livraison** : Vérifier le statut de livraison des SMS envoyés
4. **Numéro par défaut** : Permettre de définir un numéro SMS principal (comme pour les emails)

