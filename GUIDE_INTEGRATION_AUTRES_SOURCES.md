# Guide d'Intégration : WhatsApp, Messenger, Téléphone

Ce guide explique comment intégrer d'autres sources de messages (WhatsApp, Messenger, SMS/Téléphone) dans votre système d'inbox.

## 📋 Architecture actuelle

Le système est déjà préparé pour gérer plusieurs sources :
- ✅ **Email** (IMAP) - Déjà implémenté
- 🔄 **WhatsApp** - À intégrer
- 🔄 **Messenger (Facebook)** - À intégrer
- 🔄 **SMS/Téléphone** - À intégrer
- ✅ **Formulaire web** - Structure prête

### Structure de la base de données

Les modèles `Conversation` et `InboxMessage` supportent déjà :
- `source` : "email" | "whatsapp" | "messenger" | "formulaire" | "sms"
- `from_phone` : Pour WhatsApp/SMS
- `from_email` : Pour email
- `external_id` : ID du message dans le système externe
- `external_metadata` : Métadonnées supplémentaires (JSON)

---

## 📱 1. WhatsApp Business API

### Option A : WhatsApp Business API Officielle (Recommandé)

#### Prérequis
- Compte WhatsApp Business
- Accès à l'API WhatsApp Business (via Meta Business)
- Token d'accès API

#### Étapes d'intégration

1. **Créer un service WhatsApp dans le backend**

Créez `backend/app/core/whatsapp_service.py` :

```python
"""
Service pour gérer les messages WhatsApp via l'API officielle.
"""
import requests
from typing import Dict, Optional, List
from datetime import datetime


class WhatsAppService:
    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.base_url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def send_message(self, to: str, message: str) -> Dict:
        """
        Envoie un message WhatsApp.
        to: numéro de téléphone au format international (ex: 33612345678)
        message: texte du message
        """
        url = f"{self.base_url}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()
    
    def send_template(self, to: str, template_name: str, parameters: List[str]) -> Dict:
        """
        Envoie un message template WhatsApp.
        """
        url = f"{self.base_url}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "fr"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": param}
                            for param in parameters
                        ]
                    }
                ]
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()
```

2. **Ajouter le modèle d'intégration WhatsApp**

Créez une migration pour ajouter un nouveau type d'intégration dans `InboxIntegration` :

```python
# Dans backend/alembic/versions/xxx_add_whatsapp_integration.py
# Ajouter le type "whatsapp" aux types d'intégration possibles
```

3. **Créer le webhook pour recevoir les messages WhatsApp**

Ajoutez dans `backend/app/api/routes/inbox_webhooks.py` :

```python
from app.core.whatsapp_service import WhatsAppService

@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """
    Webhook pour recevoir les messages WhatsApp depuis l'API Meta.
    """
    body = await request.body()
    
    # Vérifier la signature (optionnel mais recommandé)
    secret = settings.WEBHOOK_SECRET  # À configurer
    if x_webhook_signature:
        if not verify_webhook_signature(body, x_webhook_signature, secret):
            raise HTTPException(status_code=403, detail="Signature invalide")
    
    data = await request.json()
    
    # Gérer le challenge de vérification Meta
    if request.query_params.get("hub.mode") == "subscribe":
        challenge = request.query_params.get("hub.challenge")
        verify_token = request.query_params.get("hub.verify_token")
        
        if verify_token == settings.MESSENGER_VERIFY_TOKEN:
            return Response(content=challenge, media_type="text/plain")
        else:
            raise HTTPException(status_code=403, detail="Token de vérification invalide")
    
    # Traiter les messages entrants
    if "entry" in data:
        for entry in data["entry"]:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Nouveau message
                if "messages" in value:
                    for message in value["messages"]:
                        from_number = message.get("from")
                        message_id = message.get("id")
                        message_type = message.get("type")
                        
                        # Récupérer le texte
                        if message_type == "text":
                            text = message.get("text", {}).get("body", "")
                        else:
                            text = f"[{message_type}]"  # Pour images, audio, etc.
                        
                        # Récupérer l'entreprise (via phone_number_id)
                        phone_number_id = value.get("metadata", {}).get("phone_number_id")
                        integration = db.query(InboxIntegration).filter(
                            InboxIntegration.integration_type == "whatsapp",
                            InboxIntegration.external_id == phone_number_id
                        ).first()
                        
                        if not integration:
                            continue
                        
                        # Créer ou trouver le client
                        client = db.query(Client).filter(
                            Client.company_id == integration.company_id,
                            Client.phone == from_number
                        ).first()
                        
                        if not client:
                            client = Client(
                                company_id=integration.company_id,
                                name=from_number,  # Ou récupérer le nom via l'API
                                phone=from_number,
                                type="Client"
                            )
                            db.add(client)
                            db.flush()
                        
                        # Trouver ou créer la conversation
                        conversation = db.query(Conversation).filter(
                            Conversation.company_id == integration.company_id,
                            Conversation.client_id == client.id,
                            Conversation.source == "whatsapp"
                        ).order_by(Conversation.created_at.desc()).first()
                        
                        if not conversation:
                            conversation = Conversation(
                                company_id=integration.company_id,
                                client_id=client.id,
                                subject=f"Conversation WhatsApp - {from_number}",
                                status="À répondre",
                                source="whatsapp",
                                unread_count=1,
                                last_message_at=datetime.utcnow()
                            )
                            db.add(conversation)
                            db.flush()
                        
                        # Créer le message
                        inbox_message = InboxMessage(
                            conversation_id=conversation.id,
                            from_name=client.name,
                            from_phone=from_number,
                            content=text,
                            source="whatsapp",
                            is_from_client=True,
                            read=False,
                            external_id=message_id,
                            external_metadata={
                                "type": message_type,
                                "phone_number_id": phone_number_id
                            }
                        )
                        db.add(inbox_message)
                        
                        conversation.last_message_at = datetime.utcnow()
                        conversation.unread_count += 1
                        
                        # Classification automatique
                        from app.core.conversation_classifier import auto_classify_conversation_status
                        if conversation.status not in ["Archivé", "Spam", "Urgent"]:
                            new_status = auto_classify_conversation_status(db, conversation, inbox_message)
                            conversation.status = new_status
                        
                        db.commit()
    
    return {"status": "ok"}
```

### Option B : WhatsApp via API tierce (Twilio, etc.)

Si vous utilisez un service tiers comme Twilio :

```python
from twilio.rest import Client

class WhatsAppTwilioService:
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.client = Client(account_sid, auth_token)
        self.from_number = from_number
    
    def send_message(self, to: str, message: str):
        return self.client.messages.create(
            from_=f"whatsapp:{self.from_number}",
            body=message,
            to=f"whatsapp:{to}"
        )
```

---

## 💬 2. Facebook Messenger

### Intégration via Meta Messenger Platform

1. **Créer une page Facebook et une application Meta**
2. **Configurer le webhook Messenger**

Ajoutez dans `backend/app/api/routes/inbox_webhooks.py` :

```python
@router.post("/messenger")
async def receive_messenger_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook pour recevoir les messages Messenger.
    """
    # Gérer le challenge de vérification
    if request.query_params.get("hub.mode") == "subscribe":
        challenge = request.query_params.get("hub.challenge")
        verify_token = request.query_params.get("hub.verify_token")
        
        if verify_token == settings.MESSENGER_VERIFY_TOKEN:
            return Response(content=challenge, media_type="text/plain")
        else:
            raise HTTPException(status_code=403)
    
    data = await request.json()
    
    # Traiter les messages
    if "entry" in data:
        for entry in data["entry"]:
            for messaging_event in entry.get("messaging", []):
                sender_id = messaging_event.get("sender", {}).get("id")
                
                # Message reçu
                if "message" in messaging_event:
                    message = messaging_event["message"]
                    message_text = message.get("text", "")
                    message_id = message.get("mid")
                    
                    # Récupérer l'intégration Messenger de l'entreprise
                    # (à adapter selon votre logique)
                    integration = db.query(InboxIntegration).filter(
                        InboxIntegration.integration_type == "messenger",
                        InboxIntegration.is_active == True
                    ).first()
                    
                    if not integration:
                        continue
                    
                    # Créer/find client et conversation (même logique que WhatsApp)
                    # ...
    
    return {"status": "ok"}

@router.post("/messenger/send")
async def send_messenger_message(
    recipient_id: str,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envoie un message via Messenger.
    """
    import requests
    
    # Récupérer l'intégration Messenger
    integration = db.query(InboxIntegration).filter(
        InboxIntegration.company_id == current_user.company_id,
        InboxIntegration.integration_type == "messenger",
        InboxIntegration.is_active == True
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration Messenger non trouvée")
    
    page_access_token = integration.access_token  # À stocker dans InboxIntegration
    
    url = f"https://graph.facebook.com/v18.0/me/messages"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message},
        "access_token": page_access_token
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    return {"status": "sent"}
```

---

## 📞 3. SMS/Téléphone

### Option A : Via Twilio (Recommandé)

1. **Installer Twilio**
```bash
pip install twilio
```

2. **Créer un service SMS**

Créez `backend/app/core/sms_service.py` :

```python
"""
Service pour envoyer/recevoir des SMS via Twilio.
"""
from twilio.rest import Client
from typing import Dict, Optional
from app.core.config import settings


class SMSService:
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.client = Client(account_sid, auth_token)
        self.from_number = from_number
    
    def send_sms(self, to: str, message: str) -> Dict:
        """
        Envoie un SMS.
        to: numéro au format international (ex: +33612345678)
        """
        try:
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )
            return {
                "status": "sent",
                "message_sid": message_obj.sid,
                "status_text": message_obj.status
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    def receive_sms(self, webhook_data: Dict) -> Dict:
        """
        Traite un SMS reçu via webhook Twilio.
        """
        return {
            "from": webhook_data.get("From"),
            "to": webhook_data.get("To"),
            "body": webhook_data.get("Body"),
            "message_sid": webhook_data.get("MessageSid")
        }
```

3. **Créer le webhook SMS**

Ajoutez dans `backend/app/api/routes/inbox_webhooks.py` :

```python
from app.core.sms_service import SMSService

@router.post("/sms")
async def receive_sms_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook pour recevoir les SMS depuis Twilio.
    """
    form_data = await request.form()
    
    from_number = form_data.get("From", "").replace("whatsapp:", "").replace("+", "")
    to_number = form_data.get("To", "")
    message_body = form_data.get("Body", "")
    message_sid = form_data.get("MessageSid", "")
    
    # Trouver l'intégration SMS
    integration = db.query(InboxIntegration).filter(
        InboxIntegration.integration_type == "sms",
        InboxIntegration.external_id == to_number,  # Le numéro Twilio
        InboxIntegration.is_active == True
    ).first()
    
    if not integration:
        return {"status": "integration_not_found"}
    
    # Créer/find client
    client = db.query(Client).filter(
        Client.company_id == integration.company_id,
        Client.phone == from_number
    ).first()
    
    if not client:
        client = Client(
            company_id=integration.company_id,
            name=from_number,
            phone=from_number,
            type="Client"
        )
        db.add(client)
        db.flush()
    
    # Trouver ou créer la conversation
    conversation = db.query(Conversation).filter(
        Conversation.company_id == integration.company_id,
        Conversation.client_id == client.id,
        Conversation.source == "sms"
    ).order_by(Conversation.created_at.desc()).first()
    
    if not conversation:
        conversation = Conversation(
            company_id=integration.company_id,
            client_id=client.id,
            subject=f"SMS - {from_number}",
            status="À répondre",
            source="sms",
            unread_count=1,
            last_message_at=datetime.utcnow()
        )
        db.add(conversation)
        db.flush()
    
    # Créer le message
    inbox_message = InboxMessage(
        conversation_id=conversation.id,
        from_name=client.name,
        from_phone=from_number,
        content=message_body,
        source="sms",
        is_from_client=True,
        read=False,
        external_id=message_sid,
        external_metadata={
            "from": from_number,
            "to": to_number
        }
    )
    db.add(inbox_message)
    
    conversation.last_message_at = datetime.utcnow()
    conversation.unread_count += 1
    
    # Classification automatique
    from app.core.conversation_classifier import auto_classify_conversation_status
    if conversation.status not in ["Archivé", "Spam", "Urgent"]:
        new_status = auto_classify_conversation_status(db, conversation, inbox_message)
        conversation.status = new_status
    
    db.commit()
    
    return {"status": "ok"}
```

---

## 🎯 4. Configuration dans l'interface

### Ajouter les types d'intégration dans le modèle

1. **Mettre à jour le modèle `InboxIntegration`**

Ajoutez dans `backend/app/db/models/inbox_integration.py` :

```python
# Ajouter les nouveaux types d'intégration
INTEGRATION_TYPES = ["imap", "whatsapp", "messenger", "sms", "formulaire"]
```

2. **Mettre à jour le frontend**

Dans `src/components/settings/InboxIntegrationsTab.tsx`, ajoutez les options :

```typescript
const integrationTypes = [
  { value: "imap", label: "Email (IMAP)" },
  { value: "whatsapp", label: "WhatsApp Business" },
  { value: "messenger", label: "Facebook Messenger" },
  { value: "sms", label: "SMS (Twilio)" },
  { value: "formulaire", label: "Formulaire web" },
];
```

---

## 🔧 5. Envoi de messages depuis l'inbox

Pour permettre d'envoyer des messages via ces nouvelles sources, modifiez `backend/app/api/routes/inbox.py` :

```python
@router.post("/conversations/{conversation_id}/messages")
async def create_message(
    conversation_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # ... code existant ...
    
    # Si le message vient de l'entreprise, l'envoyer via le bon canal
    if not message_data.is_from_client:
        conversation = db.query(Conversation).filter(...).first()
        
        if conversation.source == "whatsapp":
            from app.core.whatsapp_service import WhatsAppService
            # Récupérer l'intégration WhatsApp
            integration = db.query(InboxIntegration).filter(...).first()
            whatsapp = WhatsAppService(integration.phone_number_id, integration.access_token)
            whatsapp.send_message(client.phone, message_data.content)
        
        elif conversation.source == "sms":
            from app.core.sms_service import SMSService
            # Récupérer l'intégration SMS
            integration = db.query(InboxIntegration).filter(...).first()
            sms = SMSService(integration.account_sid, integration.auth_token, integration.from_number)
            sms.send_sms(client.phone, message_data.content)
        
        elif conversation.source == "messenger":
            # Envoyer via Messenger API
            # ...
```

---

## 📝 6. Checklist d'intégration

Pour chaque nouvelle source :

- [ ] Créer le service d'envoi (ex: `whatsapp_service.py`)
- [ ] Créer le webhook de réception dans `inbox_webhooks.py`
- [ ] Ajouter le type d'intégration dans le modèle `InboxIntegration`
- [ ] Créer une migration si nécessaire
- [ ] Mettre à jour l'interface pour configurer l'intégration
- [ ] Implémenter l'envoi depuis l'inbox
- [ ] Tester la réception de messages
- [ ] Tester l'envoi de messages
- [ ] Documenter les credentials nécessaires

---

## 🔐 7. Variables d'environnement

Ajoutez dans `.env` :

```env
# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_VERIFY_TOKEN=xxx

# Messenger
MESSENGER_PAGE_ACCESS_TOKEN=xxx
MESSENGER_VERIFY_TOKEN=xxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+33xxx

# Webhooks
WEBHOOK_SECRET=xxx
```

---

## 🚀 Prochaines étapes

1. **Commencez par WhatsApp** (le plus utilisé)
2. **Puis Messenger** (via Meta Business)
3. **Enfin SMS** (via Twilio ou autre)

Chaque intégration suit le même pattern :
1. Service d'envoi
2. Webhook de réception
3. Configuration dans l'interface
4. Test end-to-end

Souhaitez-vous que je commence par implémenter l'une de ces intégrations ?

