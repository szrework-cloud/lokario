# 🚦 Throttling des requêtes OpenAI

## 📋 Problème identifié

L'application rencontrait des erreurs `429 Too Many Requests` lors des appels à l'API OpenAI, ce qui indiquait que le nombre de requêtes par seconde dépassait les limites autorisées par OpenAI.

```
2025-12-25 18:28:16 - httpx - INFO - HTTP Request: POST https://api.openai.com/v1/chat/completions "HTTP/1.1 429 Too Many Requests"
```

## 🔍 Causes identifiées

1. **Appels simultanés** : Plusieurs services OpenAI (`ai_classifier`, `ai_reply`, `chatbot`) peuvent faire des appels en même temps
2. **Pas de throttling** : Aucun système de limitation de taux côté application
3. **Rate limits OpenAI** : OpenAI limite le nombre de requêtes par minute/seconde selon le plan

## ✅ Solution implémentée

### Module de throttling centralisé (`backend/app/core/openai_throttle.py`)

Un module centralisé qui garantit un délai minimum entre chaque requête OpenAI :

```python
def throttle_openai_request():
    """
    Throttle les requêtes OpenAI pour éviter de dépasser les rate limits.
    Assure un délai minimum entre les requêtes.
    """
    # Thread-safe avec verrouillage
    # Délai minimum: 0.35 secondes (≈ 3 requêtes/seconde max)
```

### Caractéristiques

- **Thread-safe** : Utilise un `threading.Lock()` pour garantir le délai même avec des threads multiples
- **Délai minimum** : 0.35 secondes entre chaque requête (≈ 3 requêtes/seconde maximum)
- **Global** : Une seule instance partagée entre tous les services OpenAI

### Services modifiés

1. **`ai_classifier_service.py`** : Classification automatique des messages
   - `classify_messages_batch()`
   - `classify_message_to_folder()`
   - `is_notification_email()`
   - `is_notification_email_batch()`
   - `is_real_client_email()`

2. **`ai_reply_service.py`** : Génération de réponses IA
   - `generate_reply()`

3. **`chatbot_service.py`** : Service de chatbot
   - `generate_response()`

### Utilisation

Chaque appel à `self.client.chat.completions.create()` est précédé de `throttle_openai_request()` :

```python
# Throttle pour éviter les rate limits
throttle_openai_request()

# Appel à l'API OpenAI
response = self.client.chat.completions.create(
    model="gpt-4o-mini",
    messages=api_messages,
    ...
)
```

## 📊 Impact attendu

1. **Réduction des erreurs 429** : Le throttling préventif évite de dépasser les limites
2. **Stabilité accrue** : Les requêtes sont espacées pour éviter les pics de trafic
3. **Pas d'impact sur les performances** : Le délai de 0.35s est négligeable par rapport au temps de réponse OpenAI (généralement 1-3 secondes)

## 🔧 Configuration

Le délai minimum peut être ajusté dans `backend/app/core/openai_throttle.py` :

```python
_openai_min_delay_seconds = 0.35  # Délai minimum entre requêtes
```

**Recommandations** :
- **0.35s** : Pour plans OpenAI standard (≈ 3 req/s max)
- **0.5s** : Si vous avez encore des erreurs 429 (≈ 2 req/s max)
- **0.2s** : Si vous avez un plan avec limites plus élevées (≈ 5 req/s max)

## 📝 Notes importantes

- Le throttling est **global** : tous les services partagent la même limite
- Le système est **thread-safe** : fonctionne correctement avec des requêtes simultanées
- Le fallback existant reste actif : en cas d'erreur 429, le système fait un fallback gracieux (pas de classification IA, mais l'application continue de fonctionner)

## 🚀 Déploiement

Ces modifications ont été déployées sur la branche `main` et seront automatiquement déployées en production via Railway.

## 🔄 Monitoring

Surveillez les logs pour vérifier que les erreurs 429 ont disparu :

```bash
# Chercher les erreurs 429
grep "429" logs/*.log

# Chercher les messages de throttling (niveau DEBUG)
grep "AI THROTTLE" logs/*.log
```

Si des erreurs 429 persistent, augmentez `_openai_min_delay_seconds` à 0.5 ou 0.6 secondes.

## 📚 Références

- `backend/app/core/openai_throttle.py` : Module de throttling
- `backend/app/core/ai_classifier_service.py` : Service de classification
- `backend/app/core/ai_reply_service.py` : Service de génération de réponses
- `backend/app/core/chatbot_service.py` : Service de chatbot

