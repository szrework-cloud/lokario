# 🔧 Comment utiliser le pooler Supabase

## ⚠️ Votre URL actuelle

```
postgresql://postgres:full33%26AZERT@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
```

Cette URL utilise `db.ufnncdjjzkbsemtrxjep.supabase.co:5432` = **connexion directe** (plus lente)

## ✅ URL avec pooler (à utiliser)

Le pooler utilise un format différent. Voici comment l'obtenir :

### Étape 1 : Aller dans Supabase Dashboard

1. Allez sur : https://app.supabase.com
2. Sélectionnez votre projet
3. Settings → Database

### Étape 2 : Trouver l'URL avec pooler

1. Section **"Connection string"**
2. Cherchez **l'onglet "Connection pooling"** (pas "URI" ou "Direct connection")
3. Cliquez sur "Connection pooling"
4. Vous verrez une URL qui ressemble à :

```
postgresql://postgres.ufnncdjjzkbsemtrxjep:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Différences importantes :**
- ✅ Utilise `postgres.xxx` (pas juste `postgres`)
- ✅ Utilise `pooler.supabase.com` (pas `db.xxx.supabase.co`)
- ✅ Utilise le port `6543` (pas `5432`)
- ✅ Contient `aws-0-region` dans l'URL

### Étape 3 : Construire votre URL complète

En remplaçant `[YOUR-PASSWORD]` par votre mot de passe :

```
postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Note :** Remplacez `eu-central-1` par votre vraie région (peut être `us-east-1`, `eu-west-1`, etc.)

## 📋 Format complet

**URL avec pooler :**
```
postgresql://postgres.xxx:mot_de_passe@aws-0-REGION.pooler.supabase.com:6543/postgres
```

**URL directe (votre actuelle, plus lente) :**
```
postgresql://postgres:mot_de_passe@db.xxx.supabase.co:5432/postgres
```

## 🔍 Comment trouver votre région

Dans Supabase → Settings → Infrastructure, vous verrez votre région (ex: `eu-central-1`, `us-east-1`, etc.)

## ⚠️ Important : Le mot de passe

Votre mot de passe `full33&AZERT` contient `&` qui doit être encodé en `%26` :
- ✅ `full33%26AZERT` (correct)

## 📝 Configuration dans Railway

Dans Railway → Variables → `DATABASE_URL` :

**Value :**
```
postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-0-VOTRE_REGION.pooler.supabase.com:6543/postgres
```

Remplacez `VOTRE_REGION` par votre vraie région Supabase.

## 🎯 Récapitulatif

**À changer :**
- ❌ `db.ufnncdjjzkbsemtrxjep.supabase.co:5432` 
- ✅ `aws-0-REGION.pooler.supabase.com:6543`

**À garder :**
- ✅ `postgres:full33%26AZERT@` (mais notez que dans l'URL pooler, c'est `postgres.xxx:` avec le project ref)

Allez dans Supabase → Settings → Database → Connection pooling et copiez l'URL complète, puis remplacez le mot de passe !
