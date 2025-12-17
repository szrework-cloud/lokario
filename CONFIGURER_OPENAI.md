# 🤖 Configurer OpenAI API Key

## 🔍 À quoi sert OpenAI dans l'application ?

OpenAI est utilisé pour les fonctionnalités IA de l'application :

1. **Classification automatique des conversations** (Inbox)
   - Classe automatiquement les conversations par statut
   - Détecte si c'est une question, une réclamation, etc.

2. **Réponses automatiques IA** (Inbox)
   - Génère des réponses automatiques aux messages clients
   - Utilise ChatGPT pour comprendre le contexte et répondre

3. **Chatbot**
   - Le chatbot sur le site utilise OpenAI pour répondre aux questions
   - Si OPENAI_API_KEY n'est pas configurée, le chatbot est désactivé

4. **Génération de relances IA** (Relances)
   - Aide à générer des messages de relance personnalisés

## ❓ Est-ce obligatoire ?

**NON, c'est optionnel !**

Si vous ne configurez pas OPENAI_API_KEY :
- ❌ Le chatbot sera désactivé
- ❌ Les réponses automatiques IA seront désactivées
- ❌ La classification automatique IA sera désactivée
- ✅ **Le reste de l'application fonctionne normalement** :
  - Factures, devis, clients, tâches, etc.
  - Module inbox (mais sans IA)
  - Toutes les autres fonctionnalités

## 🔑 Comment obtenir une clé OpenAI

### Étape 1 : Créer un compte OpenAI

1. Allez sur : https://platform.openai.com
2. Créez un compte ou connectez-vous
3. Vérifiez votre email

### Étape 2 : Obtenir une clé API

1. Allez sur : https://platform.openai.com/api-keys
2. Cliquez sur "Create new secret key"
3. Donnez-lui un nom (ex: "Lokario Production")
4. **Copiez la clé immédiatement** - elle ne sera affichée qu'une fois !
5. Si vous la perdez, vous devrez en créer une nouvelle

### Étape 3 : Ajouter dans Railway

1. **Railway Dashboard** → Service backend → Variables
2. Cliquez sur "+ New Variable"
3. **Name** : `OPENAI_API_KEY`
4. **Value** : Collez votre clé API OpenAI (commence par `sk-...`)
5. Sauvegarder

## 💰 Coûts OpenAI

- **Payant** : OpenAI facture selon l'utilisation (modèle pay-as-you-go)
- **Gratuit pour commencer** : Vous avez des crédits gratuits au début
- **Tarifs** : Environ $0.002 par 1000 tokens (très peu cher)

**Recommandation** : Configurez une limite de dépense dans OpenAI pour éviter les surprises.

## ✅ Vérification après configuration

Après avoir ajouté la clé et redéployé, vérifiez les logs Railway :

**Avant :**
```
OPENAI_API_KEY not configured. AI reply generation will be disabled.
OPENAI_API_KEY not configured. Chatbot will be disabled.
```

**Après :**
```
✅ Plus de warnings - Les fonctionnalités IA sont activées
```

## 🎯 Résumé

- ✅ **Optionnel** : L'application fonctionne sans
- ✅ **Utile** : Pour les fonctionnalités IA (chatbot, réponses auto, classification)
- ✅ **Payant** : Mais très peu cher
- ✅ **Facile** : Juste ajouter la clé dans Railway

## 📝 Recommandation

**Si vous voulez les fonctionnalités IA :**
1. Créez un compte OpenAI
2. Obtenez une clé API
3. Ajoutez-la dans Railway

**Si vous n'en avez pas besoin pour l'instant :**
- Vous pouvez laisser sans OPENAI_API_KEY
- L'application fonctionnera normalement
- Vous pourrez l'ajouter plus tard quand vous en aurez besoin

## 🔒 Sécurité

- ✅ **Ne partagez JAMAIS** votre clé API publiquement
- ✅ **Stockez uniquement** dans Railway Variables
- ✅ **Ne la commitez JAMAIS** dans Git
- ✅ **Configurez une limite de dépense** dans OpenAI

Une fois configurée, vos fonctionnalités IA seront activées ! 🤖
