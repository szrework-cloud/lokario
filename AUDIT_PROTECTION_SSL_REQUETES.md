# 🔍 Audit des protections SSL pour les requêtes DB

## ✅ Fichiers avec protection `execute_with_retry`

1. **checklists.py** - Protection sur `get_checklist_templates`
2. **tasks.py** - Protection sur `get_employees`, `get_task_stats`
3. **companies.py** - Protection sur `get_onboarding_status`, `update_my_company_settings`
4. **quotes.py** - Protection sur certaines fonctions (via décorateur)
5. **followups.py** - Protection sur `get_followups`
6. **sync_emails_periodic.py** - Protection sur plusieurs requêtes (Company, Client, Conversation, InboxMessage)

## ⚠️ Fichiers critiques SANS protection complète

### 1. **inbox_integrations.py** (67 requêtes DB)
**Criticité** : 🔴 TRÈS HAUTE
- Utilisé pour la synchronisation des emails (cron toutes les 2 minutes)
- Plusieurs requêtes dans des boucles lors du traitement des emails
- **Requêtes critiques** :
  - `find_conversation_from_reply` : Plusieurs requêtes DB (lignes 104, 117, 128, 140, 149, 158)
  - `sync_integration` : Requêtes Company, CompanySettings, Conversation, InboxMessage (lignes 519, 527, etc.)
  - `get_integrations` : Requête simple mais fréquente (ligne 263)
  - `update_integration` : Requêtes importantes (ligne 385)
  - `delete_integration` : Requête simple (ligne 441)

### 2. **inbox.py** (84 requêtes DB)
**Criticité** : 🔴 TRÈS HAUTE
- Endpoint le plus fréquenté (liste des conversations)
- Plusieurs requêtes complexes avec joins
- **Requêtes critiques** :
  - `get_conversations` : Requête principale avec sous-requêtes (lignes 96, 118, 152, 165)
  - `get_conversation` : Requête avec joinedload (ligne 232)
  - `create_conversation` : Plusieurs requêtes (Conversation, Client)
  - `create_message` : Requêtes importantes (Conversation, InboxMessage)

### 3. **invoices.py** (76 requêtes DB)
**Criticité** : 🟠 HAUTE
- Gestion des factures (fréquent)
- **Requêtes critiques** :
  - `get_invoices` : Requête principale avec joins
  - `get_invoice` : Requête avec relations
  - `create_invoice`, `update_invoice` : Requêtes importantes

### 4. **dashboard.py** (32 requêtes DB)
**Criticité** : 🟠 HAUTE
- Appelé très fréquemment (page d'accueil)
- Requêtes complexes avec agrégations
- **Requêtes critiques** :
  - `get_dashboard_stats` : Plusieurs requêtes SQL complexes (CA mensuel, factures en retard, etc.)
  - Ces requêtes sont déjà optimisées mais pas protégées contre SSL

### 5. **projects.py** (42 requêtes DB)
**Criticité** : 🟡 MOYENNE
- Moins fréquenté que inbox/dashboard
- **Requêtes critiques** : Liste des projets, détails d'un projet

### 6. **clients.py** (15 requêtes DB)
**Criticité** : 🟡 MOYENNE
- Requêtes simples, moins fréquenté
- Protection moins urgente

## 📋 Recommandations

### Priorité 1 (À faire immédiatement)
1. **inbox_integrations.py** - Fonction `sync_integration` et `find_conversation_from_reply`
   - Ces fonctions sont appelées lors de chaque sync (toutes les 2 minutes)
   - Plusieurs requêtes DB dans des boucles

2. **inbox.py** - Fonction `get_conversations`
   - Endpoint le plus fréquenté
   - Requêtes complexes avec sous-requêtes

### Priorité 2 (À faire bientôt)
3. **dashboard.py** - Fonction `get_dashboard_stats`
   - Appelé très fréquemment
   - Requêtes SQL complexes

4. **invoices.py** - Fonctions principales (`get_invoices`, `get_invoice`)
   - Fréquemment utilisé

### Priorité 3 (Nice to have)
5. **projects.py** - Protection des endpoints principaux
6. **clients.py** - Protection optionnelle (moins urgent)

## 🎯 Stratégie d'implémentation

Pour chaque fichier, ajouter `execute_with_retry` sur :
- Les requêtes dans les boucles
- Les requêtes complexes avec joins/sous-requêtes
- Les requêtes dans les endpoints fréquentés
- Les requêtes dans les scripts/background tasks

**Pattern à utiliser** :
```python
from app.db.retry import execute_with_retry

def _get_company():
    return db.query(Company).filter(Company.id == company_id).first()
company = execute_with_retry(db, _get_company, max_retries=3, initial_delay=0.5, max_delay=2.0)
```

**Ne PAS protéger** :
- Les requêtes simples dans des endpoints peu fréquentés
- Les requêtes de création/modification (commit/rollback gère déjà les erreurs)
- Les requêtes déjà dans un try/except avec gestion spécifique

