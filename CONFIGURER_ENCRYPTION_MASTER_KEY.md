# 🔐 Configurer ENCRYPTION_MASTER_KEY

## ⚠️ Pourquoi c'est important

`ENCRYPTION_MASTER_KEY` est utilisée pour chiffrer les données sensibles stockées en base de données :
- Mots de passe des intégrations email (Gmail, Outlook, etc.)
- Clés API d'intégrations
- Secrets webhook
- Autres données sensibles

**Sans cette clé, toutes ces données sont stockées en clair dans la base de données** (risque de sécurité).

## 🔑 Étape 1 : Générer une clé sécurisée

### Option A : Via Python (Recommandé)

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Cela générera une clé aléatoire de 32 bytes, encodée en base64, par exemple :
```
xK8vJ2mN9pQ7rT5wY3zA6bC4dE8fG1hI0jK2lM3nO4pQ5rS6tU7vW8xY9zA0bC1dE2fG
```

### Option B : Via OpenSSL

```bash
openssl rand -base64 32
```

### Option C : Via Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 🚂 Étape 2 : Ajouter dans Railway (Staging/Production)

### Pour Staging

1. **Railway Dashboard**
   - Allez sur : https://railway.app
   - Sélectionnez votre projet → Service backend (staging)

2. **Variables**
   - Onglet "Variables"
   - Cliquez sur "+ New Variable"

3. **Remplir**
   - **Name** : `ENCRYPTION_MASTER_KEY`
   - **Value** : Collez la clé générée (ex: `xK8vJ2mN9pQ7rT5wY3zA6bC4dE8fG1hI0jK2lM3nO4pQ5rS6tU7vW8xY9zA0bC1dE2fG`)
   - ⚠️ **Pas d'espaces** avant ou après !

4. **Sauvegarder**
   - Cliquez sur "Add" ou "Save"

5. **Redéployer**
   - Railway devrait redéployer automatiquement
   - Ou déclenchez un redéploiement manuel

### Pour Production

Même processus, mais sur le service backend de production.

## 💻 Étape 3 : Ajouter dans .env (Local)

Si vous développez en local, ajoutez dans votre fichier `.env` :

```env
ENCRYPTION_MASTER_KEY=xK8vJ2mN9pQ7rT5wY3zA6bC4dE8fG1hI0jK2lM3nO4pQ5rS6tU7vW8xY9zA0bC1dE2fG
```

⚠️ **Important** : Ne commitez JAMAIS le fichier `.env` avec cette clé dans Git !

## ✅ Étape 4 : Vérification

Après le redéploiement, vérifiez les logs Railway :

### ❌ Avant (sans clé) :
```
2025-12-24 09:27:00 - app.core.encryption_service - WARNING - ENCRYPTION_MASTER_KEY non configurée. Les données sensibles ne seront pas chiffrées.
2025-12-24 09:27:00 - app.core.encryption_service - WARNING - Chiffrement non activé - données stockées en clair
```

### ✅ Après (avec clé) :
```
✅ Plus de warnings - Le chiffrement est activé
```

Les warnings devraient disparaître complètement.

## 🔄 Migration des données existantes

⚠️ **Attention** : Si vous avez déjà des données en clair dans la base :

1. **Les anciennes données restent en clair** (elles ne seront pas automatiquement chiffrées)
2. **Les nouvelles données seront chiffrées** (après configuration de la clé)
3. **Pour chiffrer les anciennes données**, il faudrait :
   - Créer un script de migration
   - Déchiffrer (en fait, lire en clair) les anciennes données
   - Les rechiffrer avec la nouvelle clé
   - Les sauvegarder

Pour l'instant, si vous n'avez pas encore de données sensibles en production, c'est le bon moment pour configurer la clé !

## 🔒 Bonnes pratiques

1. ✅ **Utilisez une clé longue et aléatoire** (minimum 32 bytes)
2. ✅ **Ne la partagez JAMAIS** publiquement
3. ✅ **Utilisez des clés différentes** pour staging et production
4. ✅ **Sauvegardez la clé de manière sécurisée** (gestionnaire de mots de passe)
5. ✅ **Ne la commitez JAMAIS** dans Git
6. ✅ **Changez-la régulièrement** si elle est compromise

## 🆘 En cas de perte de la clé

Si vous perdez `ENCRYPTION_MASTER_KEY` :
- ❌ **Vous ne pourrez plus déchiffrer les données existantes**
- ✅ **Vous pouvez générer une nouvelle clé** (mais les anciennes données resteront chiffrées avec l'ancienne clé)
- 💡 **Solution** : Sauvegardez la clé dans un gestionnaire de mots de passe sécurisé

## 📝 Résumé rapide

```bash
# 1. Générer la clé
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# 2. Copier la clé générée

# 3. L'ajouter dans Railway :
#    - Variables → + New Variable
#    - Name: ENCRYPTION_MASTER_KEY
#    - Value: [collez la clé]
#    - Save

# 4. Redéployer et vérifier les logs
```

