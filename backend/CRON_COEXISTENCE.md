# Coexistence des crons : Emails et Relances automatiques

## 📋 Vue d'ensemble

Le système utilise **deux crons distincts** qui peuvent coexister sans problème :

1. **Synchronisation emails** : `sync_emails_periodic.py` (toutes les minutes)
2. **Relances automatiques** : `send_automatic_followups.py` (toutes les heures)

## ✅ Pourquoi ça ne buggera pas

### 1. Sessions de base de données isolées

Chaque script crée sa propre session SQLAlchemy :

```python
# sync_emails_periodic.py
db = SessionLocal()

# send_automatic_followups.py  
db: Session = SessionLocal()
```

Les sessions sont **indépendantes** et ne partagent pas de transactions.

### 2. Tables différentes (principalement)

**Synchronisation emails** accède à :
- `inbox_integrations` (lecture)
- `conversations` (création/modification)
- `inbox_messages` (création)
- `clients` (lecture/création)
- `inbox_folders` (lecture/création)

**Relances automatiques** accède à :
- `followups` (lecture/modification)
- `followup_history` (création)
- `conversations` (lecture/création) ⚠️
- `inbox_messages` (création) ⚠️
- `clients` (lecture)
- `company_settings` (lecture)

### 3. Point d'interaction : Conversations et Messages

Les deux scripts peuvent créer/modifier `conversations` et `inbox_messages`, mais :

✅ **Pas de conflit car** :
- Les scripts utilisent des **sessions séparées**
- SQLAlchemy gère les **verrous de base de données** automatiquement
- Les opérations sont **atomiques** (une transaction à la fois)
- SQLite (et PostgreSQL) gèrent les **concurrences** correctement

### 4. Fréquences différentes

- **Emails** : Toutes les minutes (60 fois/heure)
- **Relances** : Toutes les heures (1 fois/heure)

La probabilité qu'ils s'exécutent **exactement en même temps** est très faible.

## 🔒 Gestion des conflits

### SQLite (développement)

SQLite gère les **verrous au niveau de la base de données** :
- Les écritures sont **séquentielles** (une à la fois)
- Les lectures peuvent être **parallèles**
- Si un script écrit, l'autre attend automatiquement

### PostgreSQL (production)

PostgreSQL gère mieux la concurrence :
- **MVCC** (Multi-Version Concurrency Control)
- Les transactions sont **isolées**
- Pas de blocage entre lectures

## ⚠️ Cas d'usage possibles

### Scénario 1 : Les deux scripts créent une conversation en même temps

**Ce qui se passe** :
1. Script emails crée une conversation pour un client
2. Script relances crée une conversation pour le même client (quelques secondes après)

**Résultat** : ✅ **Pas de problème**
- Le script relances vérifie d'abord si une conversation existe
- Si elle existe, il l'utilise (pas de duplication)
- Si elle n'existe pas, il en crée une nouvelle

**Code dans `send_automatic_followups.py`** :
```python
# Chercher une conversation existante
existing_conversation = db.query(Conversation).filter(
    Conversation.company_id == followup.company_id,
    Conversation.client_id == followup.client_id,
    Conversation.source == method
).first()

if existing_conversation:
    conversation = existing_conversation
else:
    # Créer une nouvelle conversation
    conversation = Conversation(...)
```

### Scénario 2 : Les deux scripts modifient la même conversation

**Ce qui se passe** :
1. Script emails met à jour `last_message_at` d'une conversation
2. Script relances met à jour `last_message_at` de la même conversation

**Résultat** : ✅ **Pas de problème**
- SQLAlchemy gère les **conflits de mise à jour**
- La dernière écriture gagne (ce qui est le comportement attendu)
- Les deux scripts mettent `last_message_at` à `datetime.now()`, donc peu importe l'ordre

## 🛡️ Bonnes pratiques déjà en place

### 1. Gestion d'erreurs

Les deux scripts gèrent les erreurs proprement :

```python
try:
    # Opérations DB
    db.commit()
except Exception as e:
    db.rollback()
    logger.error(f"Erreur: {e}")
finally:
    db.close()
```

### 2. Transactions courtes

Les scripts font des **commits fréquents** pour éviter les verrous longs :
- Chaque relance est commitée individuellement
- Chaque email est commité individuellement

### 3. Vérifications avant création

Le script relances vérifie l'existence avant de créer :
```python
existing_conversation = db.query(Conversation).filter(...).first()
if existing_conversation:
    # Utiliser l'existante
else:
    # Créer nouvelle
```

## 📊 Monitoring recommandé

Pour surveiller les éventuels problèmes :

```bash
# Vérifier les logs des deux crons
tail -f backend/logs/email_sync.log
tail -f backend/logs/followups_auto.log

# Chercher les erreurs de verrouillage
grep -i "lock\|deadlock\|timeout" backend/logs/*.log
```

## ✅ Conclusion

**Les deux crons peuvent coexister sans problème** car :

1. ✅ Sessions DB isolées
2. ✅ Gestion automatique des verrous par SQLAlchemy/DB
3. ✅ Transactions courtes et atomiques
4. ✅ Vérifications avant création (évite les doublons)
5. ✅ Fréquences différentes (réduit les collisions)

**Aucune modification nécessaire** - le système est conçu pour gérer cette coexistence.
