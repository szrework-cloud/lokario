# 🖼️ Rendu des Images dans les PDFs : Mécanisme ReportLab

## 📋 Vue d'ensemble

Ce document explique comment ReportLab charge et affiche les logos et signatures dans les PDFs de devis/factures.

---

## 🔍 1. CLASSE Image DE REPORTLAB

### 1.1. Import et Utilisation

```python
from reportlab.platypus import Image

# Création d'un objet Image
logo_image = Image(
    filename_or_stream,  # Chemin fichier (str) ou BytesIO
    width=35*mm,         # Largeur en millimètres
    height=35*mm,        # Hauteur en millimètres
    kind='proportional'  # Maintient les proportions originales
)
```

### 1.2. Formats Supportés

ReportLab supporte plusieurs formats d'image:
- **PNG** ✅ (avec transparence alpha)
- **JPEG/JPG** ✅
- **GIF** ✅
- **BMP** ✅

**Important**: ReportLab gère nativement la transparence PNG, donc les logos PNG transparents sont préservés.

---

## 🎨 2. LOGO D'ENTREPRISE : Rendu sur Canvas

### 2.1. Fonction: `draw_header_on_canvas()`

Le logo est dessiné **directement sur le canvas** du PDF, ce qui permet un contrôle précis de sa position.

### 2.2. Processus de Chargement

```python
def draw_header_on_canvas(canvas_obj, doc, primary_color, secondary_color, 
                          logo_path=None, company_name=None):
    logo_loaded = False
    logo_image = None
    
    if logo_path:
        # 1. Normalisation du chemin
        normalized_path = logo_path
        if normalized_path.startswith("uploads/"):
            normalized_path = normalized_path[8:]
        
        # 2. Construction du chemin absolu
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        if not Path(normalized_path).is_absolute():
            logo_path_absolute = upload_dir / normalized_path
            logo_path = str(logo_path_absolute.resolve())
        
        # 3. TENTATIVE 1: Chargement depuis système de fichiers local
        if Path(logo_path).exists():
            try:
                logo_image = Image(logo_path, width=35*mm, height=35*mm, kind='proportional')
                logo_loaded = True
            except Exception as e:
                logo_loaded = False
        
        # 4. TENTATIVE 2: Si non trouvé localement → Supabase Storage
        if not logo_loaded:
            if is_supabase_storage_configured():
                file_content = download_from_supabase(normalized_path)
                if file_content:
                    # CRITIQUE: ReportLab nécessite un fichier physique
                    # On ne peut pas passer directement BytesIO pour le canvas
                    # Solution: Sauvegarder temporairement
                    company_id = normalized_path.split("/")[0]
                    temp_dir = upload_dir / company_id / "temp_logos"
                    temp_dir.mkdir(parents=True, exist_ok=True)
                    temp_logo_path = temp_dir / f"logo_{uuid.uuid4().hex[:8]}.png"
                    
                    # Sauvegarder le contenu téléchargé dans un fichier temporaire
                    with open(temp_logo_path, "wb") as temp_file:
                        temp_file.write(file_content)
                    
                    # Maintenant ReportLab peut charger l'image
                    logo_image = Image(str(temp_logo_path), 
                                      width=35*mm, height=35*mm, 
                                      kind='proportional')
                    logo_loaded = True
```

### 2.3. Rendu sur le Canvas

```python
# Après avoir chargé l'image avec succès
if logo_loaded and logo_image:
    # Position du logo en haut à droite
    logo_x = A4[0] - 50*mm  # 50mm depuis le bord droit
    logo_y = A4[1] - 45*mm  # 45mm depuis le haut
    
    # Dessiner sur le canvas
    canvas_obj.saveState()  # Sauvegarder l'état du canvas
    logo_image.drawOn(canvas_obj, logo_x, logo_y)
    canvas_obj.restoreState()  # Restaurer l'état
```

**Pourquoi `drawOn()` ?**
- `drawOn()` est une méthode de la classe `Image` de ReportLab
- Elle dessine directement sur le canvas du PDF
- Permet un positionnement précis en coordonnées absolues
- L'image est dessinée **après** les autres éléments (bande diagonale, titre) pour être visible

---

## ✍️ 3. SIGNATURES : Rendu dans le Story (Flowables)

### 3.1. Différence avec le Logo

Contrairement au logo qui est dessiné sur le canvas, **les signatures sont ajoutées au "story"** (contenu flux) du PDF.

Le "story" est une liste d'éléments (flowables) qui sont ajoutés séquentiellement au document :
- Paragraphes (`Paragraph`)
- Espaces (`Spacer`)
- Tableaux (`Table`)
- **Images (`Image`)** ← Signatures

### 3.2. Signature Entreprise

```python
# Colonne gauche : Signature entreprise
left_signature_elements = []

if signature_path:
    # 1. Normalisation du chemin (même processus que le logo)
    normalized_sig_path = signature_path
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    signature_image_path = str((upload_dir / normalized_sig_path).resolve())
    
    # 2. TENTATIVE 1: Chargement depuis système de fichiers local
    if Path(signature_image_path).exists():
        signature_img = Image(signature_image_path, 
                             width=70*mm, height=25*mm, 
                             kind='proportional')
        left_signature_elements.append(signature_img)
        left_signature_elements.append(Spacer(1, 3*mm))
        signature_loaded = True
    
    # 3. TENTATIVE 2: Supabase Storage
    if not signature_loaded:
        file_content = download_from_supabase(normalized_sig_path)
        if file_content:
            # ATTENTION: Pour les signatures dans le story,
            # ReportLab PEUT accepter BytesIO directement
            signature_bytes = io.BytesIO(file_content)
            signature_img = Image(signature_bytes, 
                                 width=70*mm, height=25*mm, 
                                 kind='proportional')
            left_signature_elements.append(signature_img)
            left_signature_elements.append(Spacer(1, 3*mm))
            signature_loaded = True

# 4. Ajouter le label
left_signature_elements.append(Paragraph("Signature de l'entreprise", style))
```

### 3.3. Signature Client

```python
# Colonne droite : Signature client
right_signature_elements = []

if client_signature_path:
    # 1. Normalisation du chemin
    normalized_client_path = client_signature_path
    client_sig_path = str((upload_dir / normalized_client_path).resolve())
    
    # 2. TENTATIVE 1: Système de fichiers local
    if Path(client_sig_path).exists():
        client_signature_img = Image(client_sig_path, 
                                    width=70*mm, height=25*mm, 
                                    kind='proportional')
        right_signature_elements.append(client_signature_img)
        client_sig_loaded = True
    
    # 3. TENTATIVE 2: Supabase Storage
    if not client_sig_loaded:
        file_content = download_from_supabase(normalized_client_path)
        if file_content:
            # Pour la signature client, on utilise aussi un fichier temporaire
            # car c'est plus fiable (comme pour le logo)
            temp_sig_dir = upload_dir / company_id / "temp_signatures"
            temp_sig_path = temp_sig_dir / f"client_sig_{uuid.uuid4().hex[:8]}.png"
            
            with open(temp_sig_path, "wb") as temp_file:
                temp_file.write(file_content)
            
            client_signature_img = Image(str(temp_sig_path), 
                                        width=70*mm, height=25*mm, 
                                        kind='proportional')
            right_signature_elements.append(client_signature_img)
            client_sig_loaded = True

# 4. Si pas de signature, ajouter un espace vide
if not client_sig_loaded:
    right_signature_elements.append(Spacer(1, 20*mm))

# 5. Ajouter le label
right_signature_elements.append(Paragraph("Signature du client", style))
```

### 3.4. Insertion dans le Story

```python
# Créer un tableau avec deux colonnes (gauche: entreprise, droite: client)
signature_table = TableElement([
    [
        left_signature_elements,   # Liste d'éléments (Image + Spacer + Paragraph)
        right_signature_elements   # Liste d'éléments (Image + Spacer + Paragraph)
    ]
], colWidths=[100*mm, 80*mm])

# Ajouter le tableau au story
story.append(signature_table)
```

**Comment ça fonctionne ?**
- `TableElement` accepte des listes d'éléments comme contenu de cellule
- Chaque cellule peut contenir plusieurs flowables (Image, Spacer, Paragraph)
- ReportLab les rend séquentiellement dans la cellule
- Le tableau est ensuite ajouté au story et rendu dans le flux du document

---

## 🔄 4. COMPARAISON : Canvas vs Story

| Aspect | Logo (Canvas) | Signatures (Story) |
|--------|--------------|-------------------|
| **Méthode** | `drawOn(canvas, x, y)` | Ajout au `story` via `Table` |
| **Position** | Coordonnées absolues (x, y) | Position relative dans le flux |
| **Contrôle** | Positionnement précis | Positionnement par flowable |
| **Ordre** | Dessiné après les autres éléments | Ajouté séquentiellement au story |
| **Usage** | En-tête (répété sur chaque page) | Contenu (une seule fois) |
| **BytesIO** | ❌ Nécessite fichier temporaire | ✅ Peut parfois fonctionner (mais on utilise aussi fichier temp pour sécurité) |

---

## 📦 5. GESTION DES FICHIERS TEMPORAIRES

### 5.1. Pourquoi des Fichiers Temporaires ?

**Problème avec BytesIO:**
- ReportLab peut avoir des difficultés avec `BytesIO` dans certains contextes
- Le canvas nécessite souvent un fichier physique
- Les fichiers temporaires sont plus fiables

**Solution:**
```python
# 1. Télécharger depuis Supabase
file_content = download_from_supabase(normalized_path)  # bytes

# 2. Créer un fichier temporaire
temp_dir = upload_dir / company_id / "temp_logos"
temp_logo_path = temp_dir / f"logo_{uuid.uuid4().hex[:8]}.png"

# 3. Sauvegarder le contenu
with open(temp_logo_path, "wb") as temp_file:
    temp_file.write(file_content)

# 4. Charger avec ReportLab
logo_image = Image(str(temp_logo_path), width=35*mm, height=35*mm, kind='proportional')

# 5. Le fichier reste pendant la génération du PDF
# 6. Nettoyage après génération (voir section 5.2)
```

### 5.2. Nettoyage Automatique

```python
# Après génération du PDF (dans generate_quote_pdf)
try:
    import time
    current_time = time.time()
    max_age = 3600  # 1 heure
    
    # Nettoyer les logos temporaires
    for company_id_dir in upload_dir.iterdir():
        if company_id_dir.is_dir():
            temp_logos_dir = company_id_dir / "temp_logos"
            if temp_logos_dir.exists():
                for temp_file in temp_logos_dir.iterdir():
                    if temp_file.is_file():
                        file_age = current_time - temp_file.stat().st_mtime
                        if file_age > max_age:
                            temp_file.unlink()  # Supprimer les fichiers > 1h
            
            # Nettoyer les signatures temporaires (même processus)
            temp_signatures_dir = company_id_dir / "temp_signatures"
            # ... même logique
except Exception as cleanup_error:
    # Ne pas faire échouer la génération si le nettoyage échoue
    logger.warning(f"Error during temp files cleanup: {cleanup_error}")
```

**Pourquoi ne pas supprimer immédiatement ?**
- ReportLab peut avoir besoin du fichier pendant la génération complète du PDF
- Le nettoyage différé évite les erreurs "fichier non trouvé"
- Les fichiers temporaires sont nettoyés automatiquement après 1 heure

---

## 🎯 6. FLUX COMPLET DE RENDU

### 6.1. Logo (Canvas)

```
┌─────────────────────────────────────────┐
│ 1. Récupération du chemin               │
│    design_config.get("logo_path")       │
│    Ex: "6/logo_abc123.png"              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Normalisation du chemin              │
│    - Enlever préfixe "uploads/"         │
│    - Construire chemin absolu           │
│    Ex: "/app/uploads/6/logo_abc123.png" │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Vérification fichier local           │
│    Path(logo_path).exists() ?           │
└──────┬────────────────────────┬─────────┘
       │                        │
       │ OUI                    │ NON
       ▼                        ▼
┌──────────────┐      ┌─────────────────────┐
│ 4a. Charger  │      │ 4b. Télécharger     │
│ depuis local │      │ depuis Supabase     │
│              │      │                     │
│ Image(path)  │      │ download() → bytes  │
└──────┬───────┘      │   ↓                 │
       │              │ Sauvegarder temp    │
       │              │   ↓                 │
       │              │ Image(temp_path)    │
       │              └──────────┬──────────┘
       │                         │
       └─────────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 5. Création objet Image ReportLab       │
│    Image(path, width=35mm, height=35mm, │
│          kind='proportional')           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 6. Rendu sur Canvas                     │
│    draw_header_on_canvas()              │
│    logo_image.drawOn(canvas, x, y)      │
│    Position: (A4[0]-50mm, A4[1]-45mm)  │
└─────────────────────────────────────────┘
```

### 6.2. Signatures (Story)

```
┌─────────────────────────────────────────┐
│ 1. Récupération du chemin               │
│    signature_path ou                    │
│    client_signature_path                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Normalisation du chemin              │
│    (même processus que logo)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Vérification fichier local           │
└──────┬────────────────────────┬─────────┘
       │                        │
       │ OUI                    │ NON
       ▼                        ▼
┌──────────────┐      ┌─────────────────────┐
│ 4a. Charger  │      │ 4b. Télécharger     │
│ depuis local │      │ depuis Supabase     │
│              │      │ + Fichier temp      │
│ Image(path)  │      │ Image(temp_path)    │
└──────┬───────┘      └──────────┬──────────┘
       │                         │
       └─────────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 5. Ajout au Story                       │
│    elements.append(Image(...))          │
│    elements.append(Spacer(...))         │
│    elements.append(Paragraph(...))      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 6. Création du Tableau                  │
│    Table([                              │
│      [left_elements, right_elements]    │
│    ])                                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 7. Ajout au Story Principal             │
│    story.append(signature_table)        │
│    doc.build(story)  ← Génération PDF   │
└─────────────────────────────────────────┘
```

---

## 🔧 7. PARAMÈTRES DE L'OBJET Image

### 7.1. Paramètres Principaux

```python
Image(
    filename_or_stream,     # Chemin (str) ou BytesIO/file-like object
    width=None,             # Largeur (None = taille originale)
    height=None,            # Hauteur (None = taille originale)
    kind='normal'           # Type de redimensionnement:
                            #   - 'normal': Redimensionne à width x height
                            #   - 'proportional': Maintient les proportions
                            #   - 'bound': Adapte dans width x height (proportions)
)
```

### 7.2. Exemples d'Utilisation

```python
# Logo: 35mm x 35mm, proportions maintenues
logo_image = Image(logo_path, width=35*mm, height=35*mm, kind='proportional')

# Signature: 70mm x 25mm, proportions maintenues
signature_img = Image(sig_path, width=70*mm, height=25*mm, kind='proportional')

# Image sans redimensionnement (taille originale)
original_image = Image(image_path)
```

---

## ⚠️ 8. PROBLÈMES COURANTS ET SOLUTIONS

### 8.1. Erreur: "Cannot determine image type"

**Cause:** Fichier corrompu ou format non supporté

**Solution:**
```python
try:
    img = Image(file_path, width=35*mm, height=35*mm, kind='proportional')
except Exception as e:
    logger.error(f"Cannot load image: {e}")
    # Gérer l'erreur (afficher un message, utiliser une image par défaut, etc.)
```

### 8.2. Image non visible dans le PDF

**Causes possibles:**
1. Chemin incorrect
2. Fichier non trouvé (local ou Supabase)
3. Position hors de la page
4. Taille trop petite

**Solution:**
- Vérifier les logs pour le chemin utilisé
- Vérifier l'existence du fichier
- Vérifier les coordonnées de positionnement
- Augmenter la taille si nécessaire

### 8.3. Transparence PNG perdue

**Cause:** Conversion en JPEG

**Solution:**
- S'assurer que le logo PNG est uploadé sans conversion
- ReportLab gère nativement la transparence PNG
- Ne pas convertir en JPEG si la transparence est nécessaire

---

## 📊 9. RÉSUMÉ TECHNIQUE

### 9.1. Méthodes de Chargement

| Source | Canvas (Logo) | Story (Signatures) |
|--------|--------------|-------------------|
| **Fichier Local** | ✅ `Image(path)` | ✅ `Image(path)` |
| **Supabase Storage** | ✅ `Image(temp_file)` | ✅ `Image(temp_file)` ou `Image(BytesIO)` |
| **BytesIO Direct** | ❌ Non supporté | ⚠️ Parfois (mais on utilise temp_file) |

### 9.2. Rendu Final

- **Logo:** Dessiné sur le canvas en coordonnées absolues (en-tête répété)
- **Signature Entreprise:** Dans un Table du story (colonne gauche)
- **Signature Client:** Dans un Table du story (colonne droite)

### 9.3. Ordre de Rendering

1. Canvas: Bande diagonale → Titre "DEVIS" → **Logo** (dessiné en dernier)
2. Story: Contenu → Totaux → **Signatures** (dans un tableau)

---

## 📝 10. NOTES IMPORTANTES

- **Transparence PNG:** ReportLab la préserve nativement
- **Fichiers temporaires:** Nécessaires pour Supabase Storage (ReportLab préfère fichiers physiques)
- **Nettoyage:** Fait automatiquement après 1 heure
- **Ordre de dessin:** Le logo est dessiné après les autres éléments du canvas pour être visible
- **Proportions:** Utiliser `kind='proportional'` pour maintenir le ratio largeur/hauteur

