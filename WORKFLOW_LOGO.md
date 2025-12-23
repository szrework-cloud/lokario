# 🔄 Workflow des Logos d'Entreprise

## 📋 Vue d'ensemble

Le workflow des logos permet aux entreprises d'uploader, stocker, afficher et utiliser leur logo dans l'application, notamment dans les devis PDF.

---

## 🎯 Étapes du Workflow

### 1. **Sélection du Logo (Frontend)**

**Fichier:** `src/app/app/settings/page.tsx`

- L'utilisateur sélectionne un fichier via un `<input type="file">`
- Formats acceptés : PNG, JPG, JPEG
- Le fichier est stocké dans l'état `logoFile` ou `quoteLogoFile`
- Un aperçu est généré avec `FileReader.readAsDataURL()` et stocké dans `logoPreview`

```typescript
// Exemple de sélection
const file = e.target.files?.[0];
if (file) {
  setLogoFile(file);
  const reader = new FileReader();
  reader.onloadend = () => {
    setLogoPreview(reader.result as string);
  };
  reader.readAsDataURL(file);
}
```

---

### 2. **Recadrage Optionnel (Frontend)**

**Fichier:** `src/app/app/settings/page.tsx` (lignes ~2970-3080)

Si l'utilisateur choisit de recadrer le logo :

- Un canvas HTML5 est créé (400x400px)
- L'image est dessinée sur le canvas avec les paramètres de recadrage
- **Important:** 
  - Si l'image originale est un **PNG**, la transparence est préservée (pas de fond blanc)
  - Si l'image originale est un **JPG**, un fond blanc est ajouté avant conversion
- Le canvas est converti en blob :
  - PNG → `canvas.toBlob(callback)` (préserve la transparence)
  - JPG → `canvas.toBlob(callback, 'image/jpeg', 0.95)` (qualité 95%)
- Le blob est converti en `File` avec le bon format

```typescript
// Détection du format
const isPng = originalFile?.type === 'image/png' || originalFile?.name.toLowerCase().endsWith('.png');

// Fond blanc seulement pour JPG
if (!isPng) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
}

// Conversion avec le bon format
if (isPng) {
  canvas.toBlob(blobCallback); // PNG par défaut
} else {
  canvas.toBlob(blobCallback, 'image/jpeg', 0.95);
}
```

---

### 3. **Upload vers le Backend**

**Frontend:** `src/app/app/settings/page.tsx` (ligne ~441)
**Backend:** `backend/app/api/routes/companies.py` (ligne ~359)

#### 3.1. Frontend envoie le fichier

```typescript
const uploadResponse = await apiUploadFile<{ logo_path: string }>(
  "/companies/me/logo", 
  logoFile, 
  token
);
```

- Utilise `FormData` pour envoyer le fichier
- Headers: `Authorization: Bearer ${token}`
- Timeout: 5 minutes pour les gros fichiers

#### 3.2. Backend reçoit et valide

**Endpoint:** `POST /companies/me/logo`

**Validations:**
- ✅ Rôle: `owner` ou `super_admin` uniquement
- ✅ Extension: `.jpg`, `.jpeg`, `.png` uniquement
- ✅ Taille: Maximum 10MB
- ✅ Format: **Aucune conversion** - le format original est préservé

```python
# Le logo est uploadé SANS traitement
file_content = await file.read()
file_ext = original_file_ext  # Garder le format original
logger.info(f"Logo uploaded without processing: {file_size} bytes (format: {file_ext})")
```

---

### 4. **Stockage du Logo**

**Fichier:** `backend/app/core/supabase_storage_service.py`

#### 4.1. Priorité: Supabase Storage (Production)

Si Supabase Storage est configuré :

1. **Suppression de l'ancien logo** (si existe)
   ```python
   if old_logo_path.startswith(f"{company_id}/"):
       delete_from_supabase(old_logo_path)
   ```

2. **Upload vers Supabase**
   - Chemin: `{company_id}/logo_{uuid}.{ext}`
   - Content-Type: `image/png` ou `image/jpeg` selon l'extension
   - Bucket: Configuré dans `SUPABASE_STORAGE_BUCKET`

```python
storage_path = upload_to_supabase(
    file_path=unique_filename,
    file_content=file_content,
    content_type="image/png" if file_ext == ".png" else "image/jpeg",
    company_id=current_user.company_id
)
# Retourne: "6/logo_abc123.png"
```

#### 4.2. Fallback: Stockage Local (Développement)

Si Supabase n'est pas configuré :

1. **Création du répertoire** : `uploads/{company_id}/`
2. **Sauvegarde du fichier** : `uploads/{company_id}/logo_{uuid}.{ext}`
3. **Suppression de l'ancien logo** (si existe)

```python
company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
file_path = company_upload_dir / unique_filename
with open(file_path, "wb") as f:
    f.write(file_content)
storage_path = str(file_path.relative_to(UPLOAD_DIR))
# Retourne: "6/logo_abc123.png"
```

---

### 5. **Sauvegarde du Chemin en Base de Données**

**Fichier:** `backend/app/api/routes/companies.py` (ligne ~520)

Le chemin du logo est sauvegardé dans `CompanySettings.settings.company_info.logo_path` :

```python
company_settings.settings["company_info"]["logo_path"] = storage_path
flag_modified(company_settings, "settings")
db.commit()
```

**Structure JSON:**
```json
{
  "company_info": {
    "logo_path": "6/logo_abc123.png",
    "email": "...",
    "phone": "..."
  }
}
```

---

### 6. **Récupération du Logo (Affichage)**

**Endpoint:** `GET /companies/me/logo`

#### 6.1. Backend récupère le logo

**Fichier:** `backend/app/api/routes/companies.py` (ligne ~807)

1. **Récupère le chemin** depuis `CompanySettings.settings.company_info.logo_path`
2. **Détermine la source** (Supabase ou local)
3. **Télécharge le fichier**
4. **Retourne le fichier** avec le bon `Content-Type`

```python
# Si Supabase
file_content = download_from_supabase(logo_path)
media_type = "image/png" if logo_path.endswith(".png") else "image/jpeg"
return Response(content=file_content, media_type=media_type)

# Si local
return FileResponse(path=file_path, media_type=media_type)
```

#### 6.2. Frontend affiche le logo

**Fichier:** `src/app/app/settings/page.tsx` (ligne ~142)

```typescript
const response = await fetch(`${API_URL}/companies/me/logo`, {
  headers: { Authorization: `Bearer ${token}` }
});
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
setLogoPreview(blobUrl);
```

- Le logo est affiché via une balise `<img src={logoPreview} />`
- Les deux sections (Infos entreprise + Facturation) partagent le même logo

---

### 7. **Utilisation dans les PDFs (Devis/Factures)**

**Fichier:** `backend/app/core/quote_pdf_service.py` (ligne ~24)

Lors de la génération d'un PDF :

1. **Récupération du chemin** depuis les settings
2. **Chargement direct de l'image** par ReportLab
3. **Préservation du format original** :
   - Les PNG transparents restent en PNG avec transparence préservée
   - Les JPG restent en JPG
   - Aucune conversion forcée
4. **Affichage** en haut à droite du document

```python
# Utilisation directe du fichier image sans conversion
# ReportLab gère les PNG avec transparence directement
logo = Image(logo_path, width=35*mm, height=35*mm, kind='proportional')
logo.drawOn(canvas_obj, A4[0] - 50*mm, A4[1] - 40*mm)
```

---

## 🔄 Synchronisation entre Sections

Le logo est **synchronisé** entre deux sections :

1. **Infos entreprise** (`logoFile`, `logoPreview`)
2. **Facturation** (`quoteLogoFile`, `quoteLogoPreview`)

Quand un logo est uploadé dans une section, il est automatiquement synchronisé avec l'autre :

```typescript
// Après upload réussi
setLogoPreview(blobUrl);
setQuoteLogoPreview(blobUrl); // Synchronisation
```

---

## 🗑️ Suppression du Logo

**Endpoint:** `DELETE /companies/me/logo`

1. **Suppression du fichier** (Supabase ou local)
2. **Nettoyage du chemin** dans la base de données
3. **Réinitialisation** des previews dans le frontend

```typescript
await apiDelete("/companies/me/logo", token);
setLogoPreview(null);
setQuoteLogoPreview(null);
```

---

## 📊 Résumé du Flux

```
┌─────────────────┐
│ 1. Sélection    │ → Utilisateur choisit un fichier PNG/JPG
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Recadrage     │ → Optionnel: Canvas HTML5 (préserve transparence PNG)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Upload        │ → POST /companies/me/logo (FormData)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Validation   │ → Rôle, extension, taille (max 10MB)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Stockage      │ → Supabase Storage OU stockage local
│                 │   Chemin: {company_id}/logo_{uuid}.{ext}
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. BDD           │ → Sauvegarde chemin dans CompanySettings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Affichage     │ → GET /companies/me/logo → Blob → <img>
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. PDF           │ → Utilisation directe (PNG transparent préservé)
└─────────────────┘
```

---

## 🔑 Points Importants

### ✅ Préservation de la Transparence

- **Upload:** Le format original est préservé (PNG reste PNG)
- **Recadrage:** La transparence PNG est préservée (pas de fond blanc)
- **PDF:** La transparence PNG est préservée dans les PDFs (ReportLab gère nativement les PNG)

### ✅ Formats Supportés

- **PNG:** Transparence préservée (sauf dans PDFs)
- **JPG/JPEG:** Fond blanc ajouté lors du recadrage si nécessaire

### ✅ Stockage

- **Production:** Supabase Storage (persistant, scalable)
- **Développement:** Stockage local (`uploads/`)

### ✅ Synchronisation

- Les deux sections (Infos entreprise + Facturation) partagent le même logo
- Un seul `logo_path` dans la base de données

---

## 🐛 Problèmes Résolus

### Problème: Logo PNG transparent devient noir

**Cause:** Le recadrage convertissait toujours en JPEG, perdant la transparence.

**Solution:** 
- Détection du format original (PNG vs JPG)
- Conversion en PNG si l'original est PNG (préserve la transparence)
- Conversion en JPEG seulement si l'original est JPG (avec fond blanc)

---

## 📝 Notes Techniques

- **Taille max:** 10MB
- **Formats:** PNG, JPG, JPEG
- **Permissions:** Owner ou Super Admin uniquement
- **Cache:** Utilisation de `cache-busting` (`?t=${timestamp}`) pour forcer le rechargement
- **Blob URLs:** Nettoyage avec `URL.revokeObjectURL()` pour éviter les fuites mémoire

