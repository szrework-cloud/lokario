# 📦 Configuration Supabase Storage

Ce guide explique comment configurer Supabase Storage pour stocker de manière persistante les fichiers (logos, signatures, etc.) qui ne seront plus perdus lors des redéploiements.

## 🎯 Avantages

- ✅ **Persistance** : Les fichiers ne sont plus perdus lors des redéploiements Railway
- ✅ **Gratuit** : 1 GB de stockage gratuit avec Supabase
- ✅ **CDN intégré** : Accès rapide aux fichiers
- ✅ **Sécurisé** : Bucket privé avec authentification

## 📋 Étapes de configuration

### 1. Créer un bucket dans Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **Storage**
4. Cliquez sur **New bucket**
5. Configurez le bucket :
   - **Name** : `company-assets` (ou le nom que vous préférez)
   - **Public bucket** : ❌ **DÉSACTIVÉ** (bucket privé pour la sécurité)
   - Cliquez sur **Create bucket**

### 2. Récupérer les clés Supabase

1. Dans Supabase Dashboard, allez dans **Settings** → **API**
2. Notez les informations suivantes :
   - **Project URL** : `https://xxx.supabase.co` (c'est votre `SUPABASE_URL`)
   - **service_role key** : Cliquez sur **Reveal** pour voir la clé (c'est votre `SUPABASE_SERVICE_ROLE_KEY`)

⚠️ **IMPORTANT** : La `service_role` key a des privilèges administrateur. Ne la partagez jamais publiquement !

### 3. Configurer les variables d'environnement

#### Dans Railway (Staging/Production)

1. Allez dans votre projet Railway
2. Sélectionnez le service backend
3. Allez dans **Variables**
4. Ajoutez ces variables :

```env
# Supabase Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET
```

#### En local (optionnel)

Si vous voulez tester en local, ajoutez dans `backend/.env` :

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=company-assets
```

### 4. Redéployer le backend

Après avoir ajouté les variables d'environnement dans Railway :

1. Railway redéploiera automatiquement
2. Ou déclenchez un redéploiement manuel si nécessaire

### 5. Vérifier la configuration

Une fois redéployé, vérifiez les logs Railway. Vous devriez voir :

```
✅ Client Supabase Storage initialisé (bucket: company-assets)
```

## 🔄 Migration des fichiers existants

Les nouveaux fichiers uploadés utiliseront automatiquement Supabase Storage.

Pour les fichiers existants stockés localement :
- Ils continueront de fonctionner (fallback automatique)
- Lors du prochain upload, le nouveau fichier sera stocké dans Supabase Storage
- Les anciens fichiers locaux peuvent être supprimés manuellement si nécessaire

## 🛠️ Fonctionnement technique

### Upload de fichiers

1. Le backend essaie d'abord d'uploader vers Supabase Storage
2. Si Supabase n'est pas configuré ou échoue, fallback vers stockage local
3. Le chemin stocké en base de données indique l'emplacement (Supabase ou local)

### Récupération de fichiers

1. Le backend vérifie si le chemin ressemble à un chemin Supabase (`company_id/filename`)
2. Si oui et que Supabase est configuré → télécharge depuis Supabase Storage
3. Sinon → fallback vers stockage local

## 📝 Format des chemins

- **Supabase Storage** : `1/logo_xxx.png` (format: `company_id/filename`)
- **Stockage local** : `1/logo_xxx.png` (format relatif à `UPLOAD_DIR`)

Le système détecte automatiquement le type de stockage en fonction du format du chemin et de la configuration.

## ⚠️ Dépannage

### Erreur : "Client Supabase non disponible"

- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont bien configurés
- Vérifiez que le bucket `company-assets` existe dans Supabase
- Consultez les logs Railway pour plus de détails

### Les fichiers ne s'uploadent pas vers Supabase

- Vérifiez les logs : le système fait automatiquement un fallback vers le stockage local
- Vérifiez que le bucket existe et n'est pas public (doit être privé)
- Vérifiez les permissions de la `service_role` key

### Les fichiers existants ne se chargent plus

- Les anciens fichiers locaux continuent de fonctionner (fallback automatique)
- Les nouveaux fichiers seront stockés dans Supabase Storage
- Pour migrer manuellement, re-uploader les fichiers

## 🎉 Résultat

Une fois configuré, tous les nouveaux logos et signatures seront stockés de manière persistante dans Supabase Storage et ne seront plus perdus lors des redéploiements Railway !

