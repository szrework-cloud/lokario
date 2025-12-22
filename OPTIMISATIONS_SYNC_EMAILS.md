# Propositions d'optimisation du workflow de synchronisation des emails

## 🎯 Objectifs d'optimisation

1. **Réduire le temps de synchronisation** (actuellement ~4s pour 140 emails)
2. **Réduire les coûts OpenAI** (appels IA multiples)
3. **Réduire la charge sur la base de données** (requêtes N+1)
4. **Améliorer la scalabilité** (gérer des milliers d'emails)

---

## 📊 Analyse des goulots d'étranglement actuels

### 1. **Appels IA individuels** (Coût + Latence)
- **Problème** : Chaque nouveau client déclenche un appel OpenAI pour détecter les notifications
- **Impact** : Si 50 nouveaux emails → 50 appels IA (potentiellement 50 clients différents)
- **Coût estimé** : ~$0.001 par appel × 50 = $0.05 par sync
- **Latence** : ~200-500ms par appel × 50 = 10-25 secondes

### 2. **Classification IA individuelle** (Coût + Latence)
- **Problème** : Chaque nouvelle conversation déclenche un appel OpenAI pour la classification
- **Impact** : Si 30 nouvelles conversations → 30 appels IA
- **Coût estimé** : ~$0.001 par appel × 30 = $0.03 par sync
- **Latence** : ~200-500ms par appel × 30 = 6-15 secondes

### 3. **Commits individuels** (Performance DB)
- **Problème** : Un `db.commit()` par email traité
- **Impact** : 140 emails = 140 commits (très lent)
- **Latence** : ~10-50ms par commit × 140 = 1.4-7 secondes

### 4. **Requêtes DB individuelles** (N+1 queries)
- **Problème** : Vérification de l'existence du client pour chaque email
- **Impact** : 140 emails = 140 requêtes `SELECT * FROM clients WHERE email = ?`
- **Latence** : ~5-20ms par requête × 140 = 0.7-2.8 secondes

### 5. **Vérification de doublons** (Performance DB)
- **Problème** : Vérification Message-ID un par un
- **Impact** : 140 emails = 140 requêtes `SELECT * FROM inbox_messages WHERE external_id = ?`
- **Latence** : ~5-20ms par requête × 140 = 0.7-2.8 secondes

### 6. **Recherche de conversations** (Requêtes multiples)
- **Problème** : Jusqu'à 4 requêtes par email pour trouver une conversation
- **Impact** : 140 emails × 2 requêtes moyennes = 280 requêtes
- **Latence** : ~5-20ms × 280 = 1.4-5.6 secondes

---

## 🚀 Propositions d'optimisation

### **OPTIMISATION 1 : Batch processing pour les appels IA**

#### **1.1. Détection de notifications par batch**

**Problème actuel** :
```python
# Pour chaque email
if not client:
    is_notification = ai_service.is_notification_email(...)  # 1 appel IA
```

**Solution proposée** :
```python
# 1. Collecter tous les emails sans client
emails_to_check = []
for email_data in emails:
    if not client_exists:
        emails_to_check.append({
            "from_email": from_email,
            "subject": subject,
            "content_preview": content[:200]
        })

# 2. Un seul appel IA pour tous
if emails_to_check:
    notifications = ai_service.is_notification_email_batch(emails_to_check)
    # Retourne: {email: is_notification}
```

**Gain** :
- **Latence** : 50 appels × 300ms → 1 appel × 500ms = **-14.5 secondes**
- **Coût** : 50 appels × $0.001 → 1 appel × $0.01 = **-40% de coût**

#### **1.2. Classification par batch**

**Problème actuel** :
```python
# Pour chaque nouvelle conversation
if is_new_conversation:
    folder_id = classify_conversation_to_folder(...)  # 1 appel IA
```

**Solution proposée** :
```python
# 1. Collecter toutes les nouvelles conversations
new_conversations = []
for email in emails:
    if is_new_conversation:
        new_conversations.append({
            "conversation_id": conversation.id,
            "content": message.content[:500],
            "subject": conversation.subject,
            "from_email": message.from_email
        })

# 2. Un seul appel IA pour toutes
if new_conversations:
    classifications = ai_service.classify_messages_batch(
        messages=new_conversations,
        folders=folders_with_ai
    )
    # Retourne: {conversation_id: folder_id}
```

**Gain** :
- **Latence** : 30 appels × 300ms → 1 appel × 800ms = **-8.2 secondes**
- **Coût** : 30 appels × $0.001 → 1 appel × $0.015 = **-50% de coût**

**Note** : La fonction `classify_messages_batch` existe déjà dans `AIClassifierService`, mais n'est pas utilisée dans le workflow de sync !

---

### **OPTIMISATION 2 : Batch commits**

**Problème actuel** :
```python
# Pour chaque email
db.add(message)
db.add(conversation)
db.flush()
# ... traitement ...
db.commit()  # 1 commit par email
```

**Solution proposée** :
```python
# Traiter tous les emails en mémoire
processed_emails = []
for email_data in emails:
    # ... traitement sans commit ...
    processed_emails.append({
        "message": message,
        "conversation": conversation,
        "attachments": attachments,
        "client": client  # si nouveau
    })

# Commit unique pour tous
db.commit()  # 1 seul commit pour tous les emails
```

**Gain** :
- **Latence** : 140 commits × 20ms → 1 commit × 50ms = **-2.75 secondes**
- **Risque** : Si erreur, rollback de tous les emails (mais on peut gérer avec transactions)

**Variante hybride** : Commits par batch de 10-20 emails (meilleur compromis)

---

### **OPTIMISATION 3 : Préchargement des données (Cache DB)**

#### **3.1. Précharger tous les clients existants**

**Problème actuel** :
```python
# Pour chaque email
client = db.query(Client).filter(
    Client.company_id == company.id,
    Client.email == from_email
).first()  # 1 requête par email
```

**Solution proposée** :
```python
# 1. Précharger tous les clients de l'entreprise
existing_clients = {
    client.email: client
    for client in db.query(Client).filter(
        Client.company_id == company.id
    ).all()
}

# 2. Utiliser le cache
for email_data in emails:
    from_email = email_data.get("from", {}).get("email")
    client = existing_clients.get(from_email)  # O(1) lookup
```

**Gain** :
- **Latence** : 140 requêtes × 10ms → 1 requête × 50ms = **-1.35 secondes**
- **Charge DB** : Réduction de 99% des requêtes clients

#### **3.2. Précharger tous les Message-IDs existants**

**Problème actuel** :
```python
# Pour chaque email
if is_duplicate_message(db, company.id, message_id, ...):
    # 1 requête par email
```

**Solution proposée** :
```python
# 1. Précharger tous les Message-IDs de l'entreprise
existing_message_ids = {
    normalize_message_id(msg.external_id)
    for msg in db.query(InboxMessage.external_id)
        .join(Conversation)
        .filter(Conversation.company_id == company.id)
        .filter(InboxMessage.external_id.isnot(None))
        .all()
}

# 2. Utiliser le cache
for email_data in emails:
    normalized_id = normalize_message_id(message_id)
    if normalized_id in existing_message_ids:
        continue  # Doublon
```

**Gain** :
- **Latence** : 140 requêtes × 10ms → 1 requête × 100ms = **-1.3 secondes**
- **Charge DB** : Réduction de 99% des requêtes de doublons

#### **3.3. Précharger les conversations existantes**

**Problème actuel** :
```python
# Pour chaque email, jusqu'à 4 requêtes pour trouver une conversation
conversation = db.query(Conversation).filter(...).first()
```

**Solution proposée** :
```python
# 1. Précharger toutes les conversations de l'entreprise
existing_conversations = {
    # Index par sujet normalisé
    conv.subject: conv
    for conv in db.query(Conversation).filter(
        Conversation.company_id == company.id,
        Conversation.source == "email"
    ).all()
}

# 2. Index par Message-ID des messages
message_id_to_conversation = {}
for msg in db.query(InboxMessage).join(Conversation).filter(
    Conversation.company_id == company.id
).all():
    if msg.external_id:
        normalized_id = normalize_message_id(msg.external_id)
        message_id_to_conversation[normalized_id] = msg.conversation_id

# 3. Utiliser les caches
for email_data in emails:
    # Chercher via In-Reply-To (cache)
    if in_reply_to:
        normalized_id = normalize_message_id(in_reply_to)
        conversation_id = message_id_to_conversation.get(normalized_id)
        if conversation_id:
            conversation = existing_conversations.get(conversation_id)
    
    # Chercher via sujet (cache)
    if not conversation:
        conversation = existing_conversations.get(normalized_subject)
```

**Gain** :
- **Latence** : 280 requêtes × 10ms → 2 requêtes × 100ms = **-2.6 secondes**
- **Charge DB** : Réduction de 99% des requêtes de conversations

**Note** : Attention à la mémoire si beaucoup de conversations (peut être limité aux conversations récentes)

---

### **OPTIMISATION 4 : Traitement asynchrone**

#### **4.1. Classification IA en arrière-plan**

**Problème actuel** :
```python
# Classification IA bloque le sync
if is_new_conversation:
    folder_id = classify_conversation_to_folder(...)  # Bloque ici
```

**Solution proposée** :
```python
# 1. Traiter les emails rapidement (sans classification IA)
for email_data in emails:
    # ... traitement rapide ...
    db.commit()

# 2. Lancer la classification en arrière-plan (queue/task)
for conversation in new_conversations:
    classify_conversation_async.delay(conversation.id)  # Celery, etc.
```

**Gain** :
- **Latence sync** : Réduction immédiate de 8-15 secondes
- **UX** : L'utilisateur voit les emails immédiatement, classification en arrière-plan

**Outils** : Celery, RQ, ou simple thread pool

#### **4.2. Auto-réponse en arrière-plan**

**Problème actuel** :
```python
# Auto-réponse bloque le sync
if conversation.folder_id:
    trigger_auto_reply_if_needed(...)  # Envoie l'email ici
```

**Solution proposée** :
```python
# 1. Marquer les conversations nécessitant une auto-réponse
conversations_for_auto_reply = []

# 2. Traiter en arrière-plan
for conv in conversations_for_auto_reply:
    send_auto_reply_async.delay(conv.id)
```

**Gain** :
- **Latence sync** : Réduction de 1-3 secondes
- **Résilience** : Si l'envoi échoue, peut être retenté

---

### **OPTIMISATION 5 : Indexation de la base de données**

**Problème actuel** : Requêtes lentes sur `clients.email`, `inbox_messages.external_id`, etc.

**Solution proposée** :
```sql
-- Index sur clients.email
CREATE INDEX IF NOT EXISTS idx_clients_email_company 
ON clients(company_id, email);

-- Index sur inbox_messages.external_id
CREATE INDEX IF NOT EXISTS idx_inbox_messages_external_id 
ON inbox_messages(external_id) 
WHERE external_id IS NOT NULL;

-- Index composite sur conversations
CREATE INDEX IF NOT EXISTS idx_conversations_company_subject 
ON conversations(company_id, source, subject);
```

**Gain** :
- **Latence** : Réduction de 50-80% sur les requêtes de recherche
- **Scalabilité** : Meilleure performance avec des millions d'emails

---

### **OPTIMISATION 6 : Filtrage précoce**

**Problème actuel** : Tous les emails sont traités même s'ils sont des doublons

**Solution proposée** :
```python
# 1. Normaliser tous les Message-IDs en une fois
normalized_message_ids = {
    normalize_message_id(email.get("message_id"))
    for email in emails
    if email.get("message_id")
}

# 2. Précharger les Message-IDs existants (voir OPT 3.2)
existing_message_ids = {...}

# 3. Filtrer les doublons AVANT tout traitement
unique_emails = [
    email for email in emails
    if normalize_message_id(email.get("message_id")) not in existing_message_ids
]
```

**Gain** :
- **Traitement** : Évite de traiter 50% des emails (doublons)
- **Latence** : Réduction proportionnelle au nombre de doublons

---

### **OPTIMISATION 7 : Cache Redis pour les données fréquentes**

**Problème actuel** : Même si on précharge, les données sont rechargées à chaque sync

**Solution proposée** :
```python
# 1. Cache Redis pour les clients (TTL 5 minutes)
import redis
r = redis.Redis()

# 2. Vérifier le cache avant la DB
cache_key = f"clients:{company_id}"
cached_clients = r.get(cache_key)
if cached_clients:
    existing_clients = json.loads(cached_clients)
else:
    existing_clients = load_clients_from_db()
    r.setex(cache_key, 300, json.dumps(existing_clients))
```

**Gain** :
- **Latence** : Réduction de 50-100ms par sync (si cache hit)
- **Charge DB** : Réduction significative sur les syncs fréquents

---

## 📈 Estimation des gains totaux

### **Scénario : 140 emails, 30 nouveaux clients, 20 nouvelles conversations**

| Optimisation | Latence économisée | Coût économisé |
|--------------|-------------------|----------------|
| **1. Batch IA (notifications)** | -14.5s | -$0.04 |
| **1. Batch IA (classification)** | -8.2s | -$0.015 |
| **2. Batch commits** | -2.75s | - |
| **3. Préchargement clients** | -1.35s | - |
| **3. Préchargement Message-IDs** | -1.3s | - |
| **3. Préchargement conversations** | -2.6s | - |
| **4. Classification async** | -8s (perçu) | - |
| **6. Filtrage précoce** | -1s (si 50% doublons) | - |
| **TOTAL** | **-39.7 secondes** | **-$0.055** |

### **Résultat attendu**

- **Avant** : ~4 secondes pour 140 emails
- **Après** : **< 1 seconde** pour 140 emails (ou instantané si async)
- **Coût par sync** : Réduction de ~50%

---

## 🎯 Priorisation des optimisations

### **Phase 1 : Quick wins (Impact élevé, effort faible)**
1. ✅ **OPT 1.2** : Utiliser `classify_messages_batch` existant (déjà implémenté !)
2. ✅ **OPT 3.1** : Préchargement des clients (très simple)
3. ✅ **OPT 3.2** : Préchargement des Message-IDs (très simple)
4. ✅ **OPT 6** : Filtrage précoce des doublons (très simple)

**Effort** : 2-3 heures | **Gain** : -15-20 secondes

### **Phase 2 : Optimisations moyennes (Impact élevé, effort moyen)**
5. ✅ **OPT 1.1** : Batch detection notifications (nécessite nouvelle fonction)
6. ✅ **OPT 2** : Batch commits (attention aux rollbacks)
7. ✅ **OPT 3.3** : Préchargement conversations (attention mémoire)

**Effort** : 4-6 heures | **Gain** : -10-15 secondes supplémentaires

### **Phase 3 : Optimisations avancées (Impact moyen, effort élevé)**
8. ✅ **OPT 4** : Traitement asynchrone (nécessite infrastructure)
9. ✅ **OPT 5** : Indexation DB (nécessite migration)
10. ✅ **OPT 7** : Cache Redis (nécessite infrastructure)

**Effort** : 1-2 jours | **Gain** : -5-10 secondes + scalabilité

---

## ⚠️ Points d'attention

1. **Mémoire** : Le préchargement peut consommer beaucoup de RAM si beaucoup de données
   - **Solution** : Limiter aux conversations/clients récents (derniers 30 jours)

2. **Transactions** : Les batch commits peuvent causer des rollbacks massifs
   - **Solution** : Commits par batch de 10-20 emails

3. **Cohérence** : Le traitement async peut créer des incohérences temporaires
   - **Solution** : Marquer les conversations comme "en cours de classification"

4. **Coûts IA** : Le batch peut coûter plus par appel mais moins au total
   - **Solution** : Monitorer les coûts et ajuster la taille des batches

---

## 🔧 Implémentation recommandée

### **Étape 1 : Utiliser le batch existant (OPT 1.2)**
La fonction `classify_messages_batch` existe déjà ! Il suffit de :
1. Collecter toutes les nouvelles conversations
2. Appeler `classify_messages_batch` une seule fois
3. Appliquer les résultats

### **Étape 2 : Préchargement simple (OPT 3.1, 3.2)**
1. Charger tous les clients en mémoire au début
2. Charger tous les Message-IDs en mémoire au début
3. Utiliser des dicts pour les lookups O(1)

### **Étape 3 : Batch commits (OPT 2)**
1. Traiter tous les emails sans commit
2. Commit unique à la fin
3. Gérer les erreurs avec rollback

### **Étape 4 : Batch IA notifications (OPT 1.1)**
1. Créer `is_notification_email_batch()` dans `AIClassifierService`
2. Collecter tous les emails à vérifier
3. Un seul appel IA

---

## 📝 Conclusion

Les optimisations les plus impactantes sont :
1. **Utiliser le batch IA existant** pour la classification (déjà implémenté !)
2. **Précharger les données** en mémoire (clients, Message-IDs)
3. **Batch commits** pour réduire les I/O DB

Ces 3 optimisations seules peuvent réduire le temps de sync de **4 secondes à < 1 seconde** pour 140 emails.

