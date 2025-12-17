# 📖 Guide DÉTAILLÉ : Trouver DATABASE_URL dans Supabase

## 🔍 Option 1 : Dans Supabase Dashboard (Méthode principale)

### Étape par étape :

1. **Ouvrez votre navigateur**
   - Allez sur : https://app.supabase.com
   - Connectez-vous avec votre compte

2. **Sélectionnez votre projet**
   - Dans la liste des projets, cliquez sur votre projet

3. **Menu de gauche → Settings**
   - Cherchez l'icône ⚙️ "Settings" dans le menu de gauche
   - Cliquez dessus

4. **Settings → Database**
   - Dans le sous-menu de Settings, cherchez "Database"
   - Cliquez sur "Database"

5. **Connection string**
   - Faites défiler la page vers le bas
   - Cherchez la section "Connection string"
   - Il y a plusieurs onglets : **URI**, **JDBC**, etc.
   - **IMPORTANT** : Cliquez sur l'onglet **"URI"**

6. **Copiez l'URL**
   - Vous verrez une URL qui ressemble à :
     ```
     postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```
   - **Remplacez `[YOUR-PASSWORD]`** par votre vrai mot de passe de base de données

### Pour trouver le mot de passe :

Sur la **même page** (Settings → Database) :
- Cherchez la section **"Database password"**
- Si vous ne le connaissez pas, cliquez sur **"Reset database password"**
- ⚠️ **Notez-le immédiatement**, il n'apparaîtra qu'une fois !

---

## 🔍 Option 2 : Si vous ne trouvez pas "Database" dans Settings

### Vérifiez ces points :

1. **Êtes-vous sur le bon projet ?**
   - En haut à gauche, vérifiez le nom du projet
   - Si ce n'est pas le bon, changez de projet

2. **Menu latéral**
   - Le menu Settings est généralement tout en bas du menu de gauche
   - Faites défiler le menu si nécessaire

3. **Permissions**
   - Assurez-vous d'avoir les droits d'administrateur sur le projet

---

## 🔍 Option 3 : Utiliser l'URL depuis Railway (si déjà configurée)

Si vous avez déjà configuré Railway avec Supabase :

1. **Railway Dashboard**
   - Allez sur : https://railway.app
   - Connectez-vous
   - Sélectionnez votre projet backend

2. **Variables**
   - Cliquez sur votre service backend
   - Onglet "Variables"
   - Cherchez `DATABASE_URL`
   - Cliquez sur l'icône 👁️ pour voir la valeur (masquée par défaut)

---

## 🔍 Option 4 : Construire manuellement la DATABASE_URL

Si vous avez ces informations, vous pouvez construire l'URL :

### Format :
```
postgresql://postgres.PROJECT_REF:VOTRE_MOT_DE_PASSE@aws-0-REGION.pooler.supabase.com:6543/postgres
```

### Comment trouver chaque partie :

1. **PROJECT_REF** :
   - Settings → General
   - Cherchez "Reference ID" ou "Project ref"
   - C'est une chaîne de caractères courte

2. **VOTRE_MOT_DE_PASSE** :
   - Settings → Database → Database password
   - Ou reset si vous ne le connaissez pas

3. **REGION** :
   - Settings → General
   - Cherchez "Region" (ex: eu-central-1, us-east-1, etc.)

### Exemple complet :
```
postgresql://postgres.abcdefghijklmnop:monmotdepasse123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## 🔍 Option 5 : Vérifier dans votre code local

Si vous avez un fichier `.env` local :

```bash
cd backend
cat .env | grep DATABASE_URL
```

Ou si vous avez Railway CLI configuré localement :
```bash
railway variables
```

---

## ❓ Si vous êtes vraiment bloqué

### Alternative : Créer une nouvelle DATABASE_URL

1. **Dans Supabase Dashboard → Settings → Database**
2. **Reset database password** (si vous ne le connaissez pas)
3. **Notez le nouveau mot de passe**
4. **Connection string → URI**
5. **Construisez l'URL** en remplaçant `[YOUR-PASSWORD]` par le nouveau mot de passe

---

## 🎯 Récapitulatif : Ce que vous cherchez

Vous cherchez une URL qui :
- ✅ Commence par `postgresql://`
- ✅ Contient `postgres.` quelque part
- ✅ Contient `pooler.supabase.com` ou `direct.psql.supabase.com`
- ✅ Se termine par `/postgres`

**Exemple typique :**
```
postgresql://postgres.abcdefghijklmnop:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## 📸 Si vous pouvez faire une capture d'écran

Si vous êtes bloqué, essayez de :
1. Aller dans Settings → Database
2. Faire une capture d'écran de la page
3. Je pourrai vous guider plus précisément

Mais attention : **Ne partagez JAMAIS votre mot de passe en clair** dans une capture d'écran !
