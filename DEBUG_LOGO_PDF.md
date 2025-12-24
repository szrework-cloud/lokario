# 🔍 Diagnostic : Logo Non Affiché dans les PDFs

## ✅ Correction Appliquée

### Problème Identifié
Le `company_id` était extrait du chemin du logo de manière fragile, ce qui pouvait échouer.

### Solution
- ✅ Passage direct de `company.id` à `draw_header_on_canvas()`
- ✅ Extraction du chemin comme fallback uniquement
- ✅ Logging amélioré pour le diagnostic

## 📋 Vérifications à Faire

### 1. Vérifier que le Logo existe dans la Base de Données

**Requête SQL :**
```sql
SELECT 
    cs.company_id,
    cs.settings->'company_info'->>'logo_path' as logo_path
FROM company_settings cs
WHERE cs.company_id = VOTRE_COMPANY_ID;
```

**Attendu :**
- `logo_path` devrait contenir quelque chose comme : `"6/logo_abc123.png"`

### 2. Vérifier les Logs Backend

Cherchez dans les logs Railway/Backend ces messages :

```
[QUOTE PDF] Design config - logo_path: ...
[LOGO] Loading logo with path: ..., company_id: ...
[IMAGE LOADER] Loading image: ...
[IMAGE LOADER] Normalized path: ..., Absolute path: ...
[IMAGE LOADER] ✅ Image loaded successfully from local filesystem
OU
[IMAGE LOADER] ✅ Image loaded successfully from Supabase Storage
OU
[IMAGE LOADER] ⚠️ Failed to load image from local filesystem: ...
[IMAGE LOADER] ⚠️ No file content received from Supabase Storage
```

### 3. Scénarios Possibles

#### Scénario A : `logo_path` est `None`
```
[QUOTE PDF] Design config - logo_path: None
```
**Cause :** Le logo n'est pas configuré dans les settings de l'entreprise.

**Solution :** Uploader un logo via `/companies/me/logo`

#### Scénario B : `logo_path` existe mais fichier non trouvé localement
```
[IMAGE LOADER] Loading image: 6/logo_abc123.png
[IMAGE LOADER] Normalized path: 6/logo_abc123.png, Absolute path: /app/uploads/6/logo_abc123.png
[IMAGE LOADER] ⚠️ Failed to load image from local filesystem: [Errno 2] No such file or directory
[IMAGE LOADER] Attempting to download from Supabase Storage: 6/logo_abc123.png
[IMAGE LOADER] ⚠️ No file content received from Supabase Storage
```

**Cause :** Le fichier n'existe ni localement ni dans Supabase Storage.

**Solution :** 
1. Vérifier que le logo a bien été uploadé
2. Vérifier que Supabase Storage est configuré
3. Re-uploader le logo si nécessaire

#### Scénario C : Problème de permissions
```
[IMAGE LOADER] ⚠️ Permission denied creating temp directory
```

**Cause :** Le processus n'a pas les permissions d'écriture.

**Solution :** Vérifier les permissions sur `/app/uploads/`

#### Scénario D : Format d'image non supporté
```
[IMAGE LOADER] ⚠️ Failed to load image from local filesystem: Cannot determine image type
```

**Cause :** Le fichier n'est pas une image valide ou format non supporté.

**Solution :** Vérifier que le logo est en PNG ou JPEG.

## 🔧 Commandes de Debug

### Vérifier le logo dans la DB (via Python)

```python
from app.db.session import SessionLocal
from app.db.models.company_settings import CompanySettings

db = SessionLocal()
settings = db.query(CompanySettings).filter(
    CompanySettings.company_id == VOTRE_COMPANY_ID
).first()

if settings and settings.settings:
    logo_path = settings.settings.get("company_info", {}).get("logo_path")
    print(f"Logo path: {logo_path}")
```

### Vérifier que le fichier existe localement

```bash
# Dans le conteneur Railway ou local
ls -la /app/uploads/6/logo_*.png
# ou
ls -la ./uploads/6/logo_*.png
```

### Vérifier Supabase Storage

```python
from app.core.supabase_storage_service import download_file, is_supabase_storage_configured

if is_supabase_storage_configured():
    file_content = download_file("6/logo_abc123.png")
    if file_content:
        print(f"✅ Logo existe dans Supabase ({len(file_content)} bytes)")
    else:
        print("❌ Logo n'existe pas dans Supabase")
else:
    print("⚠️ Supabase Storage non configuré")
```

## 📝 Checklist de Diagnostic

- [ ] Le logo est configuré dans `company_settings.settings.company_info.logo_path`
- [ ] Le `logo_path` est passé dans `design_config` lors de la génération du PDF
- [ ] Le fichier existe localement OU dans Supabase Storage
- [ ] Les permissions sont correctes (écriture dans `/app/uploads/`)
- [ ] Le format de l'image est supporté (PNG ou JPEG)
- [ ] Les logs montrent une tentative de chargement

## 🚀 Prochaines Étapes

1. **Vérifier les logs** lors de la génération d'un nouveau PDF
2. **Identifier le scénario** ci-dessus qui correspond
3. **Appliquer la solution** correspondante
4. **Re-tester** la génération du PDF

## ⚠️ Note

Si le logo ne s'affiche toujours pas après ces vérifications, les logs détaillés devraient indiquer exactement où le processus échoue.

