# ✅ Vérification de Déploiement : Chargement d'Images PDF

## 🔍 Points Critiques pour la Production

### ✅ 1. Chemins et Répertoires

**Status : ✅ OK**

Le code utilise `Path.resolve()` qui convertit automatiquement les chemins relatifs en absolus :

```python
upload_dir = Path(settings.UPLOAD_DIR).resolve()
```

**Recommandation :**
- En production, définir `UPLOAD_DIR` avec un chemin absolu dans `.env` :
  ```bash
  UPLOAD_DIR=/app/uploads  # ou /var/uploads selon votre setup
  ```

**Vérification :**
```python
# Le code crée automatiquement les répertoires avec permissions
temp_dir.mkdir(parents=True, exist_ok=True)  # ✅ Crée les parents si nécessaire
```

### ✅ 2. Création des Répertoires

**Status : ✅ OK**

Le code crée automatiquement les répertoires manquants :

```python
temp_dir.mkdir(parents=True, exist_ok=True)
```

**Comportement :**
- `parents=True` : Crée tous les répertoires parents si nécessaire
- `exist_ok=True` : Ne génère pas d'erreur si le répertoire existe déjà

### ✅ 3. Gestion des Erreurs

**Status : ✅ OK**

Le code gère gracieusement les erreurs :

```python
try:
    # Créer le répertoire temporaire
    temp_dir.mkdir(parents=True, exist_ok=True)
    # ... code ...
except Exception as img_error:
    logger.error(f"[IMAGE LOADER] ❌ Error: {img_error}", exc_info=True)
    # Nettoyer en cas d'erreur
    if temp_file_path and temp_file_path.exists():
        try:
            temp_file_path.unlink()
        except Exception:
            pass
    return ImageLoadResult(loaded=False)
```

### ✅ 4. Fallback Supabase Storage

**Status : ✅ OK**

Le code vérifie si Supabase est configuré avant de l'utiliser :

```python
if not is_supabase_storage_configured():
    logger.debug(f"[IMAGE LOADER] Supabase Storage not configured, skipping download")
    return ImageLoadResult(loaded=False)
```

**Comportement :**
- Si Supabase n'est pas configuré → Ne plante pas, continue avec stockage local
- Si fichier local non trouvé → Tente Supabase
- Si Supabase échoue → Retourne gracieusement un échec avec log

### ⚠️ 5. Permissions de Fichiers

**Status : ⚠️ À vérifier selon l'environnement**

Les fichiers temporaires sont créés avec les permissions par défaut du système.

**Recommandation pour Railway/Containers :**
- Les permissions par défaut devraient suffire
- Si problème, utiliser `os.chmod()` si nécessaire

**Amélioration possible :**
```python
# Optionnel : Définir des permissions explicites (uniquement si nécessaire)
import os
temp_dir.mkdir(parents=True, exist_ok=True)
os.chmod(temp_dir, 0o755)  # rwxr-xr-x
```

### ✅ 6. Imports et Dépendances

**Status : ✅ OK**

Tous les imports sont corrects :
- `from reportlab.platypus import Image` ✅
- `from pathlib import Path` ✅ (standard library)
- `from app.core.supabase_storage_service import ...` ✅ (avec gestion ImportError)

### ✅ 7. Logging

**Status : ✅ Excellent**

Logging détaillé pour le diagnostic en production :

```python
logger.info(f"[IMAGE LOADER] Loading image: {image_path}")
logger.debug(f"[IMAGE LOADER] Normalized path: {normalized_path}, Absolute path: {absolute_path}")
logger.info(f"[IMAGE LOADER] ✅ Image loaded successfully from local filesystem")
logger.warning(f"[IMAGE LOADER] ⚠️ Failed to load image from local filesystem: {e}")
logger.error(f"[IMAGE LOADER] ❌ Error downloading from Supabase Storage: {e}", exc_info=True)
```

## 🚀 Configuration Production Recommandée

### Variables d'Environnement

```bash
# Stockage fichiers
UPLOAD_DIR=/app/uploads  # Chemin absolu recommandé en production

# Supabase Storage (recommandé pour production)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
SUPABASE_STORAGE_BUCKET=company-assets
```

### Structure de Répertoires Attendue

```
/app/uploads/
├── {company_id}/
│   ├── logo_{uuid}.{ext}              # Logos entreprise
│   ├── signature_{uuid}.jpg           # Signatures entreprise
│   ├── signatures/
│   │   └── client_signature_{quote_id}_{uuid}.png
│   ├── temp_logos/                    # Créé automatiquement
│   │   └── img_{uuid}.{ext}
│   └── temp_signatures/               # Créé automatiquement
│       └── img_{uuid}.{ext}
```

### Permissions Requises

Le processus doit avoir les permissions pour :
- ✅ **Lire** depuis `/app/uploads/`
- ✅ **Écrire** dans `/app/uploads/{company_id}/temp_*/`
- ✅ **Créer** des répertoires dans `/app/uploads/{company_id}/`

En général, si le processus peut écrire dans `/app/uploads/`, il pourra créer les sous-répertoires.

## 🔧 Tests de Vérification en Production

### Test 1 : Vérifier que les répertoires sont créés

```python
# Dans votre code de test ou au démarrage
from pathlib import Path
from app.core.config import settings

upload_dir = Path(settings.UPLOAD_DIR).resolve()
test_dir = upload_dir / "test_company" / "temp_logos"
test_dir.mkdir(parents=True, exist_ok=True)

if test_dir.exists():
    print(f"✅ Répertoire créé avec succès: {test_dir}")
    # Nettoyer
    test_dir.rmdir()
else:
    print(f"❌ Impossible de créer le répertoire: {test_dir}")
```

### Test 2 : Vérifier Supabase Storage

```python
from app.core.supabase_storage_service import is_supabase_storage_configured

if is_supabase_storage_configured():
    print("✅ Supabase Storage est configuré")
else:
    print("⚠️ Supabase Storage n'est pas configuré (utilisera stockage local uniquement)")
```

### Test 3 : Test de chargement d'image

```python
from app.core.pdf_image_loader import load_image_for_pdf
from pathlib import Path
from app.core.config import settings

upload_dir = Path(settings.UPLOAD_DIR).resolve()
result = load_image_for_pdf(
    image_path="test/logo.png",  # Chemin de test
    width=35,
    height=35,
    upload_dir=upload_dir,
    company_id=1,
    temp_subdir="temp_logos",
    kind='proportional'
)

print(f"Image chargée: {result.loaded}")
```

## ⚠️ Points d'Attention

### 1. Espace Disque

Les fichiers temporaires sont conservés 1 heure par défaut. En cas de volume élevé :

**Solution :**
- Réduire `max_age_seconds` dans `cleanup_temp_images()`
- Utiliser Supabase Storage (recommandé) pour éviter l'accumulation locale

### 2. Chemins Windows vs Linux

**Status : ✅ OK**

`Path` de pathlib gère automatiquement les différences entre systèmes.

### 3. Chemins Relatifs en Production

**Recommandation :**
- Utiliser des chemins **absolus** en production via variable d'environnement
- Le code utilise `Path.resolve()` donc les chemins relatifs seront convertis en absolus

### 4. Supabase Storage en Production

**Recommandation : ✅ FORTEMENT RECOMMANDÉ**

En production, utiliser Supabase Storage pour :
- ✅ Persistance des fichiers (pas perdus lors des redéploiements)
- ✅ Scalabilité
- ✅ Sauvegarde automatique
- ✅ Pas d'accumulation de fichiers sur le serveur

## 📋 Checklist de Déploiement

- [ ] **UPLOAD_DIR** configuré avec chemin absolu en production
- [ ] **Supabase Storage** configuré (URL + Service Role Key)
- [ ] **Permissions** : Le processus peut écrire dans UPLOAD_DIR
- [ ] **Espace disque** : Suffisant pour les fichiers temporaires
- [ ] **Logging** : Vérifier que les logs sont visibles en production
- [ ] **Test** : Tester le chargement d'une image après déploiement

## 🔍 Diagnostic en Cas de Problème

### Erreur : "Permission denied"

**Cause :** Le processus n'a pas les permissions d'écriture

**Solution :**
```bash
# Vérifier les permissions
ls -la /app/uploads

# Donner les permissions (si nécessaire)
chmod -R 755 /app/uploads
chown -R votre-user:votre-group /app/uploads
```

### Erreur : "File not found"

**Cause :** Fichier non présent localement et Supabase non configuré

**Solution :**
- Vérifier que Supabase Storage est configuré
- Vérifier que les fichiers sont bien uploadés dans Supabase
- Vérifier les logs pour voir d'où vient le problème

### Erreur : "Cannot determine image type"

**Cause :** Fichier corrompu ou format non supporté

**Solution :**
- Vérifier le format du fichier (PNG, JPG)
- Vérifier que le fichier n'est pas corrompu
- Vérifier les logs pour plus de détails

## ✅ Conclusion

**Le code est prêt pour la production** avec les vérifications suivantes :

1. ✅ Gestion des chemins (relatifs et absolus)
2. ✅ Création automatique des répertoires
3. ✅ Gestion d'erreur robuste
4. ✅ Fallback Supabase Storage
5. ✅ Logging détaillé
6. ✅ Nettoyage des fichiers temporaires

**Recommandations supplémentaires :**
- Utiliser Supabase Storage en production (recommandé)
- Configurer UPLOAD_DIR avec chemin absolu
- Monitorer l'espace disque
- Vérifier les logs après déploiement

