# 🔐 Politique RLS pour Supabase Storage

## Configuration de la politique pour le bucket `company-assets`

### Politique 1 : Upload (INSERT)

**Policy name:** `Allow authenticated uploads`

**Allowed operation:** 
- ✅ `INSERT` (upload)

**Target roles:**
- ✅ `authenticated` (ou laissez vide pour tous les rôles)

**Policy definition:**
```sql
true
```

**Explication:** Cette politique permet à tous les utilisateurs authentifiés d'uploader des fichiers. Comme vous utilisez `service_role` key côté backend, cette politique sera bypassée, mais elle est utile si vous voulez permettre l'upload depuis le frontend plus tard.

---

### Politique 2 : Download (SELECT)

**Policy name:** `Allow authenticated downloads`

**Allowed operation:**
- ✅ `SELECT` (download)

**Target roles:**
- ✅ `authenticated` (ou laissez vide pour tous les rôles)

**Policy definition:**
```sql
true
```

**Explication:** Cette politique permet à tous les utilisateurs authentifiés de télécharger des fichiers.

---

### Politique 3 : Delete (DELETE)

**Policy name:** `Allow authenticated deletes`

**Allowed operation:**
- ✅ `DELETE` (remove)

**Target roles:**
- ✅ `authenticated` (ou laissez vide pour tous les rôles)

**Policy definition:**
```sql
true
```

**Explication:** Cette politique permet à tous les utilisateurs authentifiés de supprimer des fichiers.

---

## ⚠️ Note importante

Avec la `service_role` key que vous utilisez côté backend, **les politiques RLS sont automatiquement bypassées**. La `service_role` key a des privilèges administrateur complets.

Cependant, créer ces politiques est une bonne pratique pour :
1. Permettre l'accès depuis le frontend si nécessaire plus tard
2. Respecter les bonnes pratiques de sécurité
3. Éviter des problèmes inattendus

---

## 🚀 Alternative : Politique unique pour tout

Si vous voulez une seule politique qui permet tout :

**Policy name:** `Allow all operations for authenticated users`

**Allowed operation:**
- ✅ `SELECT` (download)
- ✅ `INSERT` (upload)
- ✅ `UPDATE` (update)
- ✅ `DELETE` (remove)

**Target roles:**
- ✅ `authenticated` (ou laissez vide)

**Policy definition:**
```sql
true
```

---

## 📝 Instructions pour créer la politique dans Supabase

1. Allez dans **Supabase Dashboard** → **Storage** → **company-assets**
2. Cliquez sur **Policies** (ou **Politiques**)
3. Cliquez sur **New Policy** (ou **Nouvelle politique**)
4. Sélectionnez **For full customization** (ou **Personnalisation complète**)
5. Remplissez les champs comme indiqué ci-dessus
6. Cliquez sur **Review** puis **Save policy**

---

## ✅ Vérification

Après avoir créé les politiques, testez l'upload d'un logo. Vous devriez voir dans les logs :
```
✅ Fichier uploadé vers Supabase Storage: 3/logo_xxx.jpg
```

Si vous voyez toujours des erreurs, vérifiez :
1. Que les politiques sont bien créées et activées
2. Que le bucket n'est pas en mode "Public" si vous voulez qu'il soit privé
3. Les logs Railway pour voir l'erreur exacte

