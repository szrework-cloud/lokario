# 🔍 Comment l'IA s'active lors de la synchronisation cron

## 📋 Résumé

Oui, l'IA **peut** s'activer à chaque synchronisation (toutes les 2 minutes), mais **seulement si certaines conditions sont remplies**.

## ⚙️ Conditions d'activation de l'IA

L'IA s'active **seulement si** :

1. ✅ **OPENAI_API_KEY est configuré** dans les variables d'environnement
2. ✅ **Au moins un dossier a `autoClassify: true`** dans ses `ai_rules`

Si ces conditions ne sont pas remplies, l'IA **ne s'active PAS** et aucun appel à OpenAI n'est fait.

## 🔄 Quand l'IA s'active lors de la sync

### 1. Pour chaque **nouveau message** (ligne 255 de `sync_emails_periodic.py`)

```python
# Classification dans un dossier
folder_id = classify_conversation_to_folder(
    db=db,
    conversation=conversation,
    message=message,
    company_id=company.id
)
```

**Vérifications avant activation** :
- Le service IA est-il enabled ? (`ai_service.enabled`)
- Y a-t-il des dossiers avec `autoClassify: true` ?

**Si OUI** → Appel à OpenAI pour classifier le message
**Si NON** → Pas d'appel à OpenAI, retourne `None`

### 2. Reclassification à la fin (ligne 340)

```python
stats = reclassify_all_conversations(db=db, company_id=company.id, force=False)
```

**Avec `force=False`** → Ne reclasse **QUE** les conversations **SANS dossier** (`folder_id IS NULL`)

**Vérifications avant activation** :
- Mêmes conditions que ci-dessus
- **PLUS** : La conversation doit être sans dossier

## 🛡️ Protection contre les appels inutiles

Le code vérifie **avant chaque appel** :

```python
# Dans classify_conversation_to_folder (ligne 45-48)
ai_service = get_ai_classifier_service()
if not ai_service or not ai_service.enabled:
    logger.debug("[AI CLASSIFIER] Service IA non disponible, message non classé")
    return None  # ⛔ PAS d'appel à OpenAI

# Ligne 66-68
if not folders_with_ai:
    logger.debug("[AI CLASSIFIER] Aucun dossier avec autoClassify activé")
    return None  # ⛔ PAS d'appel à OpenAI
```

## 💰 Coûts OpenAI

- **Avec autoClassify activé** : 1 appel OpenAI par nouveau message (gpt-4o-mini)
- **Sans autoClassify** : 0 appel OpenAI
- **Reclassification** : Seulement pour les conversations sans dossier

## 🔧 Comment désactiver l'IA

Pour éviter que l'IA s'active à chaque sync :

1. **Désactiver pour toutes les entreprises** : Retirer `OPENAI_API_KEY` des variables d'environnement
2. **Désactiver pour une entreprise** : Retirer `autoClassify: true` de tous les dossiers dans les settings de l'entreprise

## 📊 Exemple de log

```
[AI CLASSIFIER] Service IA non disponible, message non classé  ← IA désactivée
```

ou

```
[AI CLASSIFIER] Aucun dossier avec autoClassify activé  ← Pas de dossier avec autoClassify
```

ou

```
[AI CLASSIFIER] Message classé dans le dossier 'Notifications' (ID: 3)  ← IA activée et utilisée
```

