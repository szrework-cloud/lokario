# 🛡️ Protections contre les problèmes de performance lors de la synchronisation

## ⚠️ Risques potentiels

### 1. **Synchronisations en masse**

Si beaucoup d'emails arrivent en même temps, la synchronisation peut :
- Prendre beaucoup de temps
- Faire beaucoup d'appels IA (coûts OpenAI)
- Créer des lags si trop de requêtes simultanées

### 2. **Limitations actuelles**

#### 📧 Emails récupérés
- **14 derniers jours** : Le système récupère uniquement les emails des 14 derniers jours (ligne ~280 de `imap_service.py`)
- **Pas de limite de nombre** : Si 1000 emails arrivent en 14 jours, ils seront tous traités

#### 🤖 Appels IA
- **1 appel par nouveau message** : Chaque nouveau message déclenche 1 appel à OpenAI
- **Throttling** : Délai minimum de 0.35s entre chaque appel (3 req/s max)
- **Batch processing** : La reclassification utilise des batches de 10 conversations

## ✅ Protections en place

### 1. **Throttling OpenAI** (ligne 15 de `openai_throttle.py`)

```python
_openai_min_delay_seconds = 0.35  # Délai minimum entre requêtes
```

**Protection** :
- Maximum 3 requêtes par seconde vers OpenAI
- Thread-safe (même si plusieurs threads appellent simultanément)
- Évite les erreurs 429 (Too Many Requests)

### 2. **Batch Processing** (ligne 107 de `folder_ai_classifier.py`)

```python
batch_size: int = 10  # Traite 10 conversations à la fois
```

**Protection** :
- La reclassification traite les conversations par batch de 10
- Réduit les coûts et la charge

### 3. **Vérifications avant activation** (ligne 46-48 de `folder_ai_classifier.py`)

```python
if not ai_service or not ai_service.enabled:
    return None  # ⛔ PAS d'appel à OpenAI

if not folders_with_ai:
    return None  # ⛔ PAS d'appel à OpenAI
```

**Protection** :
- L'IA ne s'active que si nécessaire
- Pas d'appels inutiles

### 4. **Traitement séquentiel** (ligne 308 de `sync_emails_periodic.py`)

```python
for integration in integrations:
    stats = await sync_integration(integration, db)
```

**Protection** :
- Les intégrations sont traitées **une par une** (pas en parallèle)
- Évite la surcharge du serveur

### 5. **Gestion des erreurs** (ligne 274-277)

```python
except Exception as e:
    db.rollback()
    stats["errors"] += 1
    logger.error(...)
```

**Protection** :
- Les erreurs sur un email n'arrêtent pas le traitement des autres
- Rollback automatique en cas d'erreur

## ⚠️ Risques restants

### 1. **Pas de limite sur le nombre d'emails traités**

**Scénario problématique** :
- 500 nouveaux emails en 14 jours
- 500 appels IA (si autoClassify activé)
- 500 × 0.35s = ~3 minutes de throttling minimum
- Total : ~3-5 minutes de traitement

**Solution recommandée** :
- Ajouter une limite par sync (ex: max 100 emails par sync)
- Les emails restants seront traités au sync suivant

### 2. **Pas de limite sur les conversations reclassifiées**

**Scénario problématique** :
- 1000 conversations sans dossier
- Batch de 10 = 100 appels IA
- 100 × 0.35s = ~35 secondes minimum

**Solution** :
- Le batch processing limite déjà à 10 conversations à la fois
- Mais s'il y a 1000 conversations, ça prendra du temps

### 3. **Traitement synchrone**

**Problème** :
- Si une sync prend 5 minutes, le cron suivant attendra
- Si plusieurs crons se chevauchent, ça peut créer une surcharge

**Solution recommandée** :
- Utiliser un lock file pour éviter les chevauchements
- Ou utiliser un système de queue (Redis, Celery)

## 🎯 Recommandations

### Court terme (Maintenant)

✅ **C'est OK pour l'instant** car :
- Le throttling protège contre les erreurs OpenAI
- Le batch processing limite la charge
- Les vérifications évitent les appels inutiles

### Moyen terme (Quand vous aurez plus d'utilisateurs)

1. **Limiter le nombre d'emails par sync** :
   ```python
   MAX_EMAILS_PER_SYNC = 100
   emails = emails[:MAX_EMAILS_PER_SYNC]
   ```

2. **Lock file pour éviter les chevauchements** :
   ```python
   import fcntl
   lock_file = open('/tmp/email_sync.lock', 'w')
   try:
       fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
       # Sync...
   except IOError:
       logger.info("Sync déjà en cours, on skip")
       return
   ```

3. **Limiter la reclassification** :
   ```python
   # Ne reclasse que les 50 dernières conversations sans dossier
   query = query.order_by(Conversation.created_at.desc()).limit(50)
   ```

## 📊 Calcul de performance

### Scénario réaliste (petite/moyenne entreprise)

- **10 nouveaux emails par sync** (toutes les 2 min)
- **10 appels IA** (si autoClassify activé)
- **10 × 0.35s = 3.5s** de throttling
- **Temps total : ~5-10 secondes** ✅ OK

### Scénario problématique (grande entreprise)

- **200 nouveaux emails par sync**
- **200 appels IA**
- **200 × 0.35s = 70s** de throttling minimum
- **Temps total : ~2-3 minutes** ⚠️ Peut créer des lags

## 🔧 Conclusion

**Actuellement** : Les protections sont suffisantes pour une utilisation normale.

**À surveiller** :
- Temps d'exécution des syncs dans les logs
- Nombre d'emails traités par sync
- Fréquence des erreurs 429 OpenAI

**Si problèmes** : Ajouter les limites recommandées ci-dessus.

