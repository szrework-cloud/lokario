# 📁 Guide : Classification Automatique des Messages avec ChatGPT

## 🔍 Problème : Mon message n'a pas été classé automatiquement

Si un message comme "jaimerais prendre un rdv demain !" n'a pas été classé dans le dossier "important", voici comment résoudre le problème.

## ✅ Vérifications à faire

### 1. Le dossier "important" a-t-il la classification automatique activée ?

**Dans l'interface :**
1. Allez dans **Paramètres** → **Inbox** → **Dossiers**
2. Ouvrez le dossier "important"
3. Vérifiez que **"Classer automatiquement les messages dans ce dossier"** est **coché** ✅

### 2. Le contexte du dossier est-il bien défini ?

**Le contexte aide ChatGPT à comprendre quels messages doivent aller dans ce dossier.**

Pour le dossier "important", ajoutez un contexte comme :

```
Messages importants nécessitant une attention rapide :
- Demandes de rendez-vous (rdv, rendez-vous, disponibilité)
- Demandes urgentes avec deadline
- Messages nécessitant une action rapide
- Demandes clients importantes
```

### 3. La clé API ChatGPT est-elle configurée ?

Vérifiez que `OPENAI_API_KEY` est bien configurée dans `backend/.env` :

```env
OPENAI_API_KEY=sk-proj-...
```

## 🔧 Solution immédiate : Reclasser le message

### Option 1 : Via l'interface (bientôt disponible)

Un bouton "Reclasser avec l'IA" sera ajouté dans l'interface.

### Option 2 : Via un script Python

```bash
cd backend
python scripts/reclassify_conversation.py <conversation_id>
```

### Option 3 : Via l'API

```bash
curl -X POST http://localhost:8000/inbox/conversations/{conversation_id}/reclassify \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

## 📝 Exemple de configuration d'un dossier "Important"

### Nom du dossier
```
Important
```

### Type de dossier
```
Important (ou "info", "support", etc.)
```

### Classification automatique
✅ **Activée**

### Contexte IA
```
Messages importants nécessitant une attention rapide :
- Demandes de rendez-vous (rdv, rendez-vous, disponibilité, "j'aimerais prendre un rdv")
- Demandes urgentes avec deadline
- Messages nécessitant une action rapide
- Demandes clients importantes
- Messages avec mots-clés : urgent, important, rapidement, demain, aujourd'hui
```

## 🎯 Comment ça fonctionne ?

1. **Réception du message** (SMS, Email, etc.)
2. **Vérification** : Le dossier a-t-il la classification automatique activée ?
3. **Analyse ChatGPT** : Le message correspond-il au contexte du dossier ?
4. **Classification** : Si oui, le message est classé automatiquement

## 🐛 Diagnostic

### Vérifier les logs du backend

```bash
cd backend
# Les logs de classification apparaissent dans la console
# Recherchez : "[AI CLASSIFIER]"
```

### Messages de log à surveiller

- ✅ `Message classé automatiquement dans le dossier 'Important' (ID: X)`
- ⚠️ `Aucun dossier avec classification automatique activée`
- ⚠️ `Aucun dossier approprié trouvé pour le message`
- ❌ `Classification IA désactivée (OPENAI_API_KEY non configurée)`

## 💡 Conseils

1. **Soyez précis dans le contexte** : Plus le contexte est détaillé, mieux ChatGPT comprendra
2. **Testez avec plusieurs messages** : Envoyez-vous des messages tests pour vérifier
3. **Vérifiez les logs** : Si ça ne fonctionne pas, regardez les logs pour comprendre pourquoi

## 🚀 Améliorations récentes

- ✅ Meilleure détection des demandes de RDV
- ✅ Logs améliorés pour le diagnostic
- ✅ Endpoint API pour reclasser manuellement
- ✅ Script Python pour reclasser depuis la ligne de commande

## ❓ Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs du backend
2. Vérifiez que la clé API ChatGPT est bien configurée
3. Testez avec le script de reclassification
4. Vérifiez que le contexte du dossier est bien défini

