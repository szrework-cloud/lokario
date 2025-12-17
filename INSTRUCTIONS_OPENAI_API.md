# 🔑 Instructions : Configurer OpenAI API Key dans Railway

## 📝 Ce qu'il faut mettre

### Dans Railway Variables :

**Name (Nom) :**
```
OPENAI_API_KEY
```

**Value (Valeur) :**
```
sk-votre_cle_api_ici
```
(Remplacez par votre vraie clé API qui commence par `sk-`)

## 🔍 Comment obtenir la clé API

### Étape 1 : Créer/Se connecter à OpenAI

1. Allez sur : **https://platform.openai.com**
2. Créez un compte ou connectez-vous
3. Vérifiez votre email si nécessaire

### Étape 2 : Obtenir la clé API

1. Une fois connecté, allez sur : **https://platform.openai.com/api-keys**
2. Cliquez sur le bouton **"+ Create new secret key"** ou **"Create new secret key"**
3. Donnez un nom à votre clé (ex: "Lokario Production" ou "Lokario Backend")
4. Cliquez sur **"Create secret key"**
5. **⚠️ IMPORTANT** : Une fenêtre s'ouvre avec votre clé - **COPIEZ-LA IMMÉDIATEMENT**
   - Elle commence par `sk-` suivi d'une longue chaîne de caractères
   - Exemple : `sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ`
   - Cette clé ne sera affichée qu'**une seule fois** !
   - Si vous la perdez, vous devrez en créer une nouvelle

### Étape 3 : Ajouter dans Railway

1. **Railway Dashboard** → Votre projet → Service backend
2. Onglet **"Variables"**
3. Cliquez sur **"+ New Variable"**
4. Remplissez :
   - **Name** : `OPENAI_API_KEY` (en majuscules, exactement comme ça)
   - **Value** : Collez votre clé API (ex: `sk-proj-abcdefghijklmnopqrstuvwxyz...`)
5. Cliquez sur **"Add"** ou **"Save"**
6. Railway redéploiera automatiquement

## ✅ Format exact

**Name :**
```
OPENAI_API_KEY
```

**Value (exemple) :**
```
sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ
```

⚠️ **Ne mettez PAS d'espaces** avant ou après la clé !

## 🔍 Vérification

Après le redéploiement, vérifiez les logs Railway :

**Avant (sans clé) :**
```
OPENAI_API_KEY not configured. AI reply generation will be disabled.
OPENAI_API_KEY not configured. Chatbot will be disabled.
```

**Après (avec clé) :**
```
✅ Plus de warnings - Les fonctionnalités IA sont activées
```

## 💰 Important : Coûts

OpenAI est **payant** mais très peu cher :
- Environ **$0.002 par 1000 tokens** (très peu)
- Vous avez des **crédits gratuits** au début
- **Recommandation** : Configurez une limite de dépense dans OpenAI

### Configurer une limite de dépense :

1. Allez sur : **https://platform.openai.com/account/billing/limits**
2. Configurez une limite mensuelle (ex: $10, $20, etc.)
3. Cela évite les surprises sur la facture

## 📋 Résumé rapide

```
1. https://platform.openai.com/api-keys
2. "Create new secret key"
3. Copier la clé (commence par sk-)
4. Railway → Variables → New Variable
   - Name: OPENAI_API_KEY
   - Value: sk-votre_cle_ici
5. Save
```

C'est tout ! 🎯
