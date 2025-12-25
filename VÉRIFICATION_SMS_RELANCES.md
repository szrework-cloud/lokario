# ✅ Vérification des Conditions pour l'Envoi SMS des Relances

Ce document vérifie que toutes les conditions sont bien respectées dans le code pour l'envoi de SMS via Vonage pour les relances.

## 📋 Conditions Requises

### 1. ✅ Intégration SMS Vonage Configurée

**Conditions nécessaires :**
- `integration_type == "sms"`
- `is_active == true`
- `api_key` rempli (chiffré)
- `webhook_secret` rempli (contient l'API Secret, chiffré)
- `phone_number` rempli (numéro Vonage d'envoi)

**Vérifications dans le code :**

#### Dans `backend/scripts/send_automatic_followups.py` (lignes 578-592) :
```python
# Chercher d'abord une intégration SMS (type "sms")
vonage_integration = db.query(InboxIntegration).filter(
    InboxIntegration.company_id == followup.company_id,
    InboxIntegration.integration_type == "sms",  # ✅ Vérifie le type
    InboxIntegration.is_active == True            # ✅ Vérifie is_active
).first()

# Si pas trouvé, chercher une intégration WhatsApp (rétrocompatibilité)
if not vonage_integration:
    vonage_integration = db.query(InboxIntegration).filter(
        InboxIntegration.company_id == followup.company_id,
        InboxIntegration.integration_type == "whatsapp",
        InboxIntegration.is_active == True
    ).first()
```

#### Vérifications des champs (lignes 593-612) :
```python
if not vonage_integration:
    logger.error(f"Relance {followup.id}: ❌ Aucune intégration SMS trouvée")
elif not vonage_integration.api_key:
    logger.error(f"Relance {followup.id}: ❌ API Key manquante dans l'intégration SMS")
elif not vonage_integration.webhook_secret:
    logger.error(f"Relance {followup.id}: ❌ API Secret (webhook_secret) manquant dans l'intégration SMS")
elif not vonage_integration.phone_number:
    logger.error(f"Relance {followup.id}: ❌ Numéro de téléphone manquant dans l'intégration SMS")
```

**✅ Conclusion :** Toutes les vérifications sont en place pour l'intégration SMS.

---

### 2. ✅ Template de Relance avec `method: "sms"`

**Conditions nécessaires :**
- Le template correspondant au type de relance doit avoir `method: "sms"`

**Vérifications dans le code :**

#### Dans `backend/scripts/send_automatic_followups.py` (lignes 865-879) :
```python
# Récupérer la méthode du template pour ce type de relance
if settings:
    messages = settings.get("messages", [])
    followup_type_str = str(followup.type) if followup.type else ""
    for msg_template in messages:
        if isinstance(msg_template, dict) and msg_template.get("type") == followup_type_str:
            template_method = msg_template.get("method", "email")  # ✅ Récupère la méthode
            break

# Utiliser la méthode du template, ou "email" par défaut
method = template_method if template_method else "email"
logger.info(f"Relance {followup.id}: Méthode d'envoi déterminée depuis le template: {method}")
```

#### Dans `backend/app/api/routes/followups.py` (lignes 1105-1109) :
```python
# Chercher le template correspondant au type de relance
for msg_template in messages:
    if isinstance(msg_template, dict) and msg_template.get("type") == followup.type:
        template_content = msg_template.get("content")
        template_method = msg_template.get("method", "email")  # ✅ Récupère la méthode
        break
```

**✅ Conclusion :** Le code récupère bien la méthode depuis le template (`method: "sms"`).

---

### 3. ✅ Client avec Numéro de Téléphone

**Conditions nécessaires :**
- `followup.client` existe
- `followup.client.phone` est rempli

**Vérifications dans le code :**

#### Dans `backend/scripts/send_automatic_followups.py` (ligne 612) :
```python
elif not followup.client or not followup.client.phone:
    logger.error(f"Relance {followup.id}: ❌ Numéro de téléphone client manquant")
```

#### Dans `backend/app/api/routes/followups.py` (ligne 1411) :
```python
elif not followup.client or not followup.client.phone:
    logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer le SMS: pas de téléphone client")
```

**✅ Conclusion :** Le code vérifie bien que le client a un numéro de téléphone.

---

## 🔍 Résumé des Vérifications

| Condition | Vérifiée dans le code | Fichier | Ligne |
|-----------|----------------------|---------|-------|
| `integration_type == "sms"` | ✅ | `send_automatic_followups.py` | 581 |
| `is_active == true` | ✅ | `send_automatic_followups.py` | 582 |
| `api_key` présent | ✅ | `send_automatic_followups.py` | 593-595 |
| `webhook_secret` présent | ✅ | `send_automatic_followups.py` | 596-597 |
| `phone_number` présent | ✅ | `send_automatic_followups.py` | 600-601 |
| Template `method: "sms"` | ✅ | `send_automatic_followups.py` | 875 |
| `client.phone` présent | ✅ | `send_automatic_followups.py` | 612 |
| Décryptage des credentials | ✅ | `send_automatic_followups.py` | 618-619 |
| Envoi via Vonage | ✅ | `send_automatic_followups.py` | 621-628 |

---

## ✅ Conclusion

**TOUTES les conditions sont bien vérifiées dans le code !**

Le système :
1. ✅ Cherche une intégration SMS active de type `"sms"`
2. ✅ Vérifie que tous les champs nécessaires sont présents (api_key, webhook_secret, phone_number)
3. ✅ Récupère la méthode depuis le template (`method: "sms"`)
4. ✅ Vérifie que le client a un numéro de téléphone
5. ✅ Décrypte les credentials
6. ✅ Envoie le SMS via Vonage

**Les SMS devraient fonctionner correctement si :**
- ✅ Une intégration SMS Vonage est configurée avec tous les champs
- ✅ Les templates de relance ont `method: "sms"`
- ✅ Les clients ont un numéro de téléphone

---

## 📝 Exemple de Configuration Correcte

### Intégration SMS (dans la base de données) :
```python
InboxIntegration(
    company_id=1,
    integration_type="sms",           # ✅ Type "sms"
    name="SMS Vonage Principal",
    is_active=True,                    # ✅ Active
    api_key="encrypted_api_key",       # ✅ API Key (chiffrée)
    webhook_secret="encrypted_secret", # ✅ API Secret (dans webhook_secret, chiffrée)
    phone_number="33612345678"         # ✅ Numéro Vonage
)
```

### Template de Relance (dans CompanySettings.settings) :
```json
{
  "followups": {
    "messages": [
      {
        "type": "DEVIS_NON_REPONDU",
        "content": "Bonjour {client_name}, ...",
        "method": "sms"  // ✅ Méthode "sms"
      }
    ]
  }
}
```

### Client :
```python
Client(
    id=1,
    company_id=1,
    name="Jean Dupont",
    phone="+33612345678"  # ✅ Numéro de téléphone
)
```

---

## 🔧 Pour Tester

Vous pouvez utiliser le script de test :
```bash
cd backend
python scripts/test_vonage_sms.py
```

Ou vérifier les logs lors de l'envoi d'une relance SMS pour voir si toutes les vérifications passent.

