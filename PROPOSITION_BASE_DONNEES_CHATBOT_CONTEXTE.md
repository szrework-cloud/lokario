# Proposition de Structure de Base de Données pour le Contexte ChatGPT

## Vue d'ensemble

Cette proposition définit comment structurer les données pour que ChatGPT puisse accéder au contexte de l'application et répondre aux questions des utilisateurs sur :
- Les clients
- Les factures et devis
- Les tâches
- Les projets
- Les rendez-vous
- Les relances
- Les conversations inbox
- Etc.

## Approche proposée

### Option 1 : Contexte dynamique (Recommandé) ✅

ChatGPT reçoit le contexte en temps réel lors de chaque requête. Pas besoin de table supplémentaire, on utilise les données existantes.

**Avantages :**
- Données toujours à jour
- Pas de duplication
- Moins de maintenance

**Comment ça fonctionne :**
1. L'utilisateur pose une question
2. Le backend récupère les données pertinentes de l'entreprise
3. On construit un contexte structuré pour ChatGPT
4. ChatGPT répond avec ce contexte

### Option 2 : Cache de contexte (Optionnel)

Table pour mettre en cache un résumé du contexte de l'entreprise (pour optimiser les appels ChatGPT).

---

## Structure de Contexte pour ChatGPT

### 1. Contexte de l'Entreprise

```python
# Données à inclure dans le contexte
company_context = {
    "company_name": "Nom de l'entreprise",
    "sector": "commerce / beauté / resto",
    "is_auto_entrepreneur": True/False,
    "vat_exempt": True/False,
    "settings": {
        "modules_enabled": ["tasks", "billing", "clients", ...],
        # Autres paramètres pertinents
    }
}
```

### 2. Contexte des Clients

```python
clients_context = {
    "total_clients": 25,
    "recent_clients": [
        {
            "id": 1,
            "name": "Jean Dupont",
            "email": "jean@example.com",
            "phone": "+33123456789",
            "created_at": "2024-01-15",
            "total_quotes": 5,
            "total_invoices": 3,
            "total_projects": 2
        },
        # ... (limité à 10-20 clients récents)
    ],
    "clients_with_pending_invoices": [
        {
            "id": 2,
            "name": "Marie Martin",
            "pending_amount": 1500.00,
            "oldest_invoice_date": "2024-01-10"
        }
    ]
}
```

### 3. Contexte des Factures et Devis

```python
billing_context = {
    "quotes": {
        "total": 15,
        "pending": 3,
        "recent": [
            {
                "id": 1,
                "client_name": "Jean Dupont",
                "amount": 2500.00,
                "status": "En attente",
                "created_at": "2024-01-20"
            }
        ]
    },
    "invoices": {
        "total": 30,
        "unpaid": 5,
        "total_unpaid_amount": 7500.00,
        "recent": [
            {
                "id": 1,
                "client_name": "Marie Martin",
                "amount": 1500.00,
                "status": "Impayée",
                "due_date": "2024-02-01"
            }
        ]
    }
}
```

### 4. Contexte des Tâches

```python
tasks_context = {
    "total": 45,
    "by_status": {
        "À faire": 10,
        "En cours": 5,
        "Terminée": 30
    },
    "urgent": [
        {
            "id": 1,
            "title": "Appeler client urgent",
            "priority": "high",
            "due_date": "2024-01-25"
        }
    ],
    "recent_completed": 5
}
```

### 5. Contexte des Projets

```python
projects_context = {
    "total": 8,
    "active": 3,
    "recent": [
        {
            "id": 1,
            "name": "Site web e-commerce",
            "client_name": "Jean Dupont",
            "status": "En cours",
            "progress": 60
        }
    ]
}
```

### 6. Contexte des Rendez-vous

```python
appointments_context = {
    "today": 3,
    "this_week": 8,
    "upcoming": [
        {
            "id": 1,
            "client_name": "Marie Martin",
            "date": "2024-01-25 14:00",
            "type": "Consultation"
        }
    ]
}
```

### 7. Contexte des Relances

```python
followups_context = {
    "pending": 5,
    "recent": [
        {
            "id": 1,
            "client_name": "Jean Dupont",
            "type": "Facture impayée",
            "amount": 1500.00,
            "scheduled_date": "2024-01-26"
        }
    ]
}
```

### 8. Contexte de l'Inbox

```python
inbox_context = {
    "unread": 5,
    "urgent": 2,
    "recent_conversations": [
        {
            "id": 1,
            "client_name": "Marie Martin",
            "subject": "Question sur la facture",
            "status": "À répondre",
            "last_message_at": "2024-01-24"
        }
    ]
}
```

---

## Structure de Base de Données Proposée

### Table 1 : `chatbot_conversations`

Pour stocker les conversations du chatbot.

```sql
CREATE TABLE chatbot_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Table 2 : `chatbot_messages`

Pour stocker les messages échangés.

```sql
CREATE TABLE chatbot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc.
    context_snapshot JSON, -- Snapshot du contexte utilisé pour cette réponse
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE
);
```

**Champ important : `context_snapshot`**
- Stocke un résumé du contexte utilisé pour générer la réponse
- Permet de comprendre pourquoi ChatGPT a donné telle réponse
- Format JSON avec les données pertinentes

### Table 3 : `chatbot_context_cache` (Optionnel)

Pour mettre en cache le contexte de l'entreprise (optimisation).

```sql
CREATE TABLE chatbot_context_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE,
    context_data JSON NOT NULL, -- Contexte complet de l'entreprise
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Cache expire après X minutes
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

**Utilisation :**
- Cache le contexte pendant 5-10 minutes
- Évite de reconstruire le contexte à chaque requête
- Se met à jour automatiquement quand les données changent

---

## Service de Génération de Contexte

### Fonction Python proposée

```python
async def build_company_context(company_id: int, user_id: int) -> dict:
    """
    Construit le contexte complet de l'entreprise pour ChatGPT.
    """
    # Récupérer les données de l'entreprise
    company = await get_company(company_id)
    
    # Récupérer les données pertinentes (limitées pour éviter trop de tokens)
    context = {
        "company": {
            "name": company.name,
            "sector": company.sector,
            "is_auto_entrepreneur": company.is_auto_entrepreneur,
        },
        "clients": await get_clients_summary(company_id, limit=20),
        "billing": await get_billing_summary(company_id),
        "tasks": await get_tasks_summary(company_id, limit=10),
        "projects": await get_projects_summary(company_id, limit=10),
        "appointments": await get_appointments_summary(company_id, limit=10),
        "followups": await get_followups_summary(company_id, limit=10),
        "inbox": await get_inbox_summary(company_id, limit=10),
    }
    
    return context
```

### Prompt système pour ChatGPT

```python
SYSTEM_PROMPT = """
Tu es un assistant intelligent pour une application de gestion administrative B2B.

Tu as accès au contexte suivant de l'entreprise :
{company_context}

Tu peux répondre aux questions sur :
- Les clients de l'entreprise
- Les factures et devis
- Les tâches à faire
- Les projets en cours
- Les rendez-vous
- Les relances
- Les conversations inbox

Réponds de manière concise et utile. Si tu n'as pas assez d'informations, dis-le clairement.
"""
```

---

## Exemples de Questions/Réponses

### Question : "Combien de clients ai-je ?"
**Contexte utilisé :** `clients_context.total_clients`
**Réponse ChatGPT :** "Vous avez actuellement 25 clients dans votre base de données."

### Question : "Quelles sont mes factures impayées ?"
**Contexte utilisé :** `billing_context.invoices.unpaid`
**Réponse ChatGPT :** "Vous avez 5 factures impayées pour un montant total de 7 500,00 €. Les plus anciennes sont : [liste]"

### Question : "Quelles sont mes tâches urgentes ?"
**Contexte utilisé :** `tasks_context.urgent`
**Réponse ChatGPT :** "Vous avez 3 tâches urgentes : [liste avec détails]"

### Question : "Qui est mon client Jean Dupont ?"
**Contexte utilisé :** Recherche dans `clients_context.recent_clients`
**Réponse ChatGPT :** "Jean Dupont est un de vos clients. Voici ses informations : [détails]"

---

## Limites et Optimisations

### Limites de tokens
- Limiter le contexte à ~2000-4000 tokens
- Ne récupérer que les données récentes/pertinentes
- Utiliser des résumés plutôt que des données complètes

### Stratégies d'optimisation
1. **Cache de contexte** : Mettre en cache pendant 5-10 minutes
2. **Contexte adaptatif** : Ne récupérer que les données pertinentes selon la question
3. **Pagination** : Limiter à 10-20 éléments par catégorie
4. **Résumés** : Utiliser des résumés plutôt que des détails complets

---

## Questions à valider

1. ✅ **Structure du contexte** - Est-ce que cette structure vous convient ?
2. ✅ **Données à inclure** - Y a-t-il d'autres données importantes à inclure ?
3. ✅ **Limites** - Combien de données récentes inclure ? (10, 20, 50 ?)
4. ✅ **Cache** - Souhaitez-vous un système de cache pour optimiser ?
5. ✅ **Contexte adaptatif** - Voulez-vous que le contexte s'adapte à la question posée ?

---

## Prochaines étapes après validation

1. ✅ Créer les modèles SQLAlchemy (`ChatbotConversation`, `ChatbotMessage`, `ChatbotContextCache`)
2. ✅ Créer la migration Alembic
3. ✅ Créer le service `build_company_context()`
4. ✅ Créer le service d'intégration ChatGPT avec contexte
5. ✅ Créer les routes API backend
6. ✅ Mettre à jour le frontend pour utiliser l'API

---

**Date de proposition :** $(date)
**Statut :** ⏳ En attente de validation

