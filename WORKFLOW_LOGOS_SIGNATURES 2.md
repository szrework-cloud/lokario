# 🔄 Workflow Complet : Logos et Signatures sur Devis/Factures

## 📋 Vue d'ensemble

Ce document décrit le workflow complet pour le stockage et l'affichage des logos d'entreprise, signatures d'entreprise et signatures client sur les devis et factures PDF.

---

## 🎯 1. LOGO D'ENTREPRISE

### 1.1. Upload du Logo

**Endpoint Backend:** `POST /companies/me/logo`

**Fichiers concernés:**
- Frontend: `src/app/app/settings/page.tsx`
- Backend: `backend/app/api/routes/companies.py` (lignes 359-524)

#### Processus d'Upload

1. **Sélection du fichier (Frontend)**
   - Formats acceptés: PNG, JPG, JPEG
   - Taille maximum: 10MB
   - Le fichier est sélectionné via `<input type="file">`
   - Un aperçu est généré avec `FileReader.readAsDataURL()`

2. **Recadrage optionnel (Frontend)**
   - Canvas HTML5 de 400x400px
   - **Important**: Préservation de la transparence PNG
     - PNG → Conversion en PNG (transparence préservée)
     - JPG → Conversion en JPEG avec fond blanc
   - Le blob résultant est converti en `File`

3. **Validation Backend**
   - Rôle requis: `owner` ou `super_admin`
   - Extension: `.jpg`, `.jpeg`, `.png`
   - Taille: Maximum 10MB
   - **Aucune conversion** - le format original est préservé

4. **Stockage**
   
   **Priorité 1: Supabase Storage** (si configuré)
   ```python
   # Chemin dans Supabase: {company_id}/logo_{uuid}.{ext}
   # Exemple: "6/logo_abc123.png"
   storage_path = upload_to_supabase(
       file_path=unique_filename,
       file_content=file_content,
       content_type="image/png" if file_ext == ".png" else "image/jpeg",
       company_id=company_id
   )
   ```
   
   **Fallback: Stockage Local** (développement)
   ```python
   # Chemin local: uploads/{company_id}/logo_{uuid}.{ext}
   # Exemple: "6/logo_abc123.png"
   file_path = UPLOAD_DIR / str(company_id) / unique_filename
   ```

5. **Sauvegarde en Base de Données**
   
   Le chemin est sauvegardé dans `CompanySettings.settings.company_info.logo_path`:
   ```json
   {
     "company_info": {
       "logo_path": "6/logo_abc123.png",
       "email": "...",
       "phone": "..."
     }
   }
   ```

### 1.2. Récupération du Logo (Affichage)

**Endpoint Backend:** `GET /companies/me/logo`

**Processus:**

1. Backend récupère le chemin depuis `CompanySettings.settings.company_info.logo_path`
2. **Si Supabase Storage:**
   - Télécharge le fichier via `download_from_supabase(logo_path)`
   - Retourne le contenu avec le bon `Content-Type`
3. **Si stockage local:**
   - Lit le fichier depuis `uploads/{logo_path}`
   - Retourne via `FileResponse`
4. Frontend affiche le logo via `<img src={blobUrl} />`

### 1.3. Utilisation dans les PDFs

**Fichier:** `backend/app/core/quote_pdf_service.py` (lignes 24-199)

**Processus lors de la génération du PDF:**

1. **Récupération du chemin** depuis `billing.quote_design.logo_path` ou `company_info.logo_path`
2. **Chargement de l'image:**
   - **Tentative 1**: Système de fichiers local
     ```python
     if Path(logo_path).exists():
         logo_image = Image(logo_path, width=35*mm, height=35*mm, kind='proportional')
     ```
   - **Tentative 2**: Supabase Storage (si non trouvé localement)
     ```python
     file_content = download_from_supabase(normalized_path)
     # Sauvegarde temporaire pour ReportLab
     temp_logo_path = upload_dir / company_id / "temp_logos" / f"logo_{uuid}.png"
     logo_image = Image(str(temp_logo_path), ...)
     ```
3. **Affichage:**
   - Position: En haut à droite du document
   - Taille: 35mm x 35mm (proportionnel)
   - La transparence PNG est préservée par ReportLab

---

## 🖊️ 2. SIGNATURE D'ENTREPRISE

### 2.1. Upload de la Signature

**Endpoint Backend:** `POST /companies/me/signature`

**Fichiers concernés:**
- Frontend: `src/app/app/settings/page.tsx`
- Backend: `backend/app/api/routes/companies.py` (lignes 527-728)

#### Processus d'Upload

1. **Validation Backend**
   - Rôle requis: `owner` ou `super_admin`
   - Extension: `.jpg`, `.jpeg`, `.png`
   - Taille: Maximum 2MB

2. **Traitement de l'image**
   - **Conversion en RGB** (avec fond blanc pour PNG/RGBA)
   - **Redimensionnement**: Maximum 400px de largeur
   - **Compression JPEG**: Qualité 85-40% pour atteindre ≤2MB
   - **Format final**: Toujours JPEG (`.jpg`)

3. **Stockage**
   
   **Priorité 1: Supabase Storage** (si configuré)
   ```python
   # Chemin dans Supabase: {company_id}/signature_{uuid}.jpg
   # Exemple: "6/signature_abc123.jpg"
   storage_path = upload_to_supabase(
       file_path=unique_filename,
       file_content=file_content,  # JPEG compressé
       content_type="image/jpeg",
       company_id=company_id
   )
   ```
   
   **Fallback: Stockage Local** (développement)
   ```python
   # Chemin local: uploads/{company_id}/signature_{uuid}.jpg
   file_path = UPLOAD_DIR / str(company_id) / unique_filename
   ```

4. **Sauvegarde en Base de Données**
   
   Le chemin est sauvegardé dans `CompanySettings.settings.billing.quote_design.signature_path`:
   ```json
   {
     "billing": {
       "quote_design": {
         "signature_path": "6/signature_abc123.jpg",
         "primary_color": "#F97316",
         "footer_text": "..."
       }
     }
   }
   ```

### 2.2. Récupération de la Signature (Affichage)

**Endpoint Backend:** `GET /companies/me/signature`

**Processus:**

1. Backend récupère le chemin depuis `billing.quote_design.signature_path`
2. Télécharge depuis Supabase Storage ou lit depuis le stockage local
3. Retourne le fichier JPEG avec `Content-Type: image/jpeg`

### 2.3. Utilisation dans les PDFs

**Fichier:** `backend/app/core/quote_pdf_service.py` (lignes 809-861)

**Processus lors de la génération du PDF:**

1. **Récupération du chemin** depuis `design_config.signature_path`
2. **Chargement de l'image:**
   - **Tentative 1**: Système de fichiers local
   - **Tentative 2**: Supabase Storage (si non trouvé localement)
3. **Affichage:**
   - Position: Colonne gauche, en bas du document (section signatures)
   - Taille: 70mm x 25mm (proportionnel)
   - Label: "Signature de l'entreprise"

---

## ✍️ 3. SIGNATURE CLIENT (Électronique)

### 3.1. Processus de Signature

**Endpoint Backend:** `POST /quotes/{quote_id}/client-signature`

**Fichiers concernés:**
- Frontend: `src/components/billing/SignatureCanvas.tsx`
- Backend: `backend/app/api/routes/quotes.py` (lignes 2400-2761)

#### Workflow Complet

1. **Accès Public au Devis**
   - Le client accède via un token public: `GET /quotes/public/{token}`
   - Le devis doit avoir un `public_token` valide et non expiré

2. **Validation de l'Identité**
   - Email OTP envoyé via `POST /quotes/public/{token}/send-otp`
   - L'email doit correspondre à l'email du client du devis
   - Code OTP envoyé par email pour validation

3. **Création de la Signature**
   - Le client dessine sa signature sur un canvas HTML5
   - La signature est exportée en base64 (PNG)
   - Métadonnées requises:
     - `signature`: Image base64 de la signature
     - `signer_email`: Email du signataire (doit correspondre au client)
     - `signer_name`: Nom du signataire (optionnel)
     - `consent_given`: Consentement explicite (requis)
     - `consent_text`: Texte du consentement affiché

4. **Génération du PDF AVANT Signature**
   ```python
   # Générer PDF sans signature client pour calculer le hash
   generate_quote_pdf(quote, client, company, temp_pdf_before, 
                      design_config=design_config, 
                      client_signature_path=None)
   document_hash_before = hashlib.sha256(pdf_content_before).hexdigest()
   ```

5. **Sauvegarde de la Signature Image**
   
   **Stockage Local:**
   ```python
   # Chemin local: uploads/{company_id}/signatures/client_signature_{quote_id}_{uuid}.png
   file_path = upload_dir / str(company_id) / "signatures" / unique_filename
   ```
   
   **Upload Supabase Storage:**
   ```python
   # Chemin Supabase: {company_id}/signatures/client_signature_{quote_id}_{uuid}.png
   relative_path = f"{company_id}/signatures/{unique_filename}"
   supabase_path = upload_to_supabase(
       file_path=relative_path,
       file_content=image_data,  # PNG décodé depuis base64
       content_type="image/png",
       company_id=company_id
   )
   ```

6. **Mise à jour du Devis**
   ```python
   quote.client_signature_path = relative_path  # Ex: "6/signatures/client_signature_5_abc123.png"
   ```

7. **Génération du PDF APRÈS Signature**
   ```python
   # Générer PDF avec signature client pour calculer le hash final
   generate_quote_pdf(quote, client, company, temp_pdf_after,
                      design_config=design_config,
                      client_signature_path=relative_path)
   signature_hash = hashlib.sha256(pdf_content_after).hexdigest()
   ```

8. **Archivage du PDF Signé**
   ```python
   # Copier le PDF signé dans l'archive (immutable)
   archive_dir = upload_dir / str(company_id) / "signed_quotes"
   archived_pdf_path = archive_dir / f"quote_{quote_id}_signed_{uuid}.pdf"
   signed_pdf_relative_path = f"{company_id}/signed_quotes/{archived_pdf_path.name}"
   ```

9. **Enregistrement des Métadonnées de Sécurité**
   
   Création d'un enregistrement `QuoteSignature` avec:
   - `signer_email`: Email du signataire
   - `signer_name`: Nom du signataire
   - `signature_hash`: Hash SHA-256 du PDF signé
   - `document_hash_before_signature`: Hash du PDF avant signature
   - `signed_pdf_path`: Chemin vers le PDF archivé (immutable)
   - `signed_at`: Horodatage de la signature
   - `ip_address`: Adresse IP du signataire
   - `user_agent`: Navigateur/device utilisé
   - `consent_given`: Consentement explicite
   - `consent_text`: Texte du consentement

10. **Journal d'Audit**
    
    Création d'entrées `QuoteSignatureAuditLog`:
    - Événement "signature_started": Début du processus
    - Événement "signature_completed": Signature complétée

11. **Mise à jour du Statut du Devis**
    ```python
    if quote.status != QuoteStatus.ACCEPTE:
        quote.status = QuoteStatus.ACCEPTE
        quote.accepted_at = signed_at
        # Arrêt automatique des relances
    ```

### 3.2. Utilisation dans les PDFs

**Fichier:** `backend/app/core/quote_pdf_service.py` (lignes 873-980)

**Processus lors de la génération du PDF:**

1. **Récupération du chemin** depuis `quote.client_signature_path` (passé en paramètre)
2. **Chargement de l'image:**
   - **Tentative 1**: Système de fichiers local
     ```python
     if Path(client_sig_path).exists():
         client_signature_img = Image(client_sig_path, width=70*mm, height=25*mm, kind='proportional')
     ```
   - **Tentative 2**: Supabase Storage (si non trouvé localement)
     ```python
     file_content = download_from_supabase(normalized_client_path)
     # Sauvegarde temporaire pour ReportLab
     temp_sig_path = upload_dir / company_id / "temp_signatures" / f"client_sig_{uuid}.png"
     client_signature_img = Image(str(temp_sig_path), ...)
     ```
3. **Affichage:**
   - Position: Colonne droite, en bas du document (section signatures)
   - Taille: 70mm x 25mm (proportionnel)
   - Label: "Signature du client"
   - Zone "Bon pour accord" affichée au-dessus si signature présente

---

## 🗂️ 4. STRUCTURE DE STOCKAGE

### 4.1. Hiérarchie des Dossiers

```
uploads/
└── {company_id}/
    ├── logo_{uuid}.{png|jpg}                    # Logo entreprise
    ├── signature_{uuid}.jpg                     # Signature entreprise
    ├── signatures/
    │   └── client_signature_{quote_id}_{uuid}.png  # Signatures client
    ├── signed_quotes/
    │   └── quote_{quote_id}_signed_{uuid}.pdf   # PDFs signés archivés (immutables)
    ├── temp/
    │   ├── quote_{quote_id}_before_signature_{uuid}.pdf  # PDF temporaire avant signature
    │   └── quote_{quote_id}_after_signature_{uuid}.pdf   # PDF temporaire après signature
    ├── temp_logos/                              # Logos temporaires pour génération PDF
    │   └── logo_{uuid}.png
    └── temp_signatures/                         # Signatures temporaires pour génération PDF
        └── client_sig_{uuid}.png
```

### 4.2. Structure Supabase Storage

Même structure que le stockage local, dans le bucket configuré (`SUPABASE_STORAGE_BUCKET`):

```
{company_id}/
├── logo_{uuid}.{png|jpg}
├── signature_{uuid}.jpg
├── signatures/
│   └── client_signature_{quote_id}_{uuid}.png
└── signed_quotes/
    └── quote_{quote_id}_signed_{uuid}.pdf
```

---

## 🔄 5. FLUX DE DONNÉES COMPLET

### 5.1. Génération d'un Devis PDF

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Récupération des Settings                                │
│    - CompanySettings.settings.company_info.logo_path        │
│    - CompanySettings.settings.billing.quote_design          │
│      ├── signature_path (signature entreprise)              │
│      ├── primary_color                                      │
│      ├── footer_text                                        │
│      └── terms_text                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Chargement du Logo                                       │
│    - Tentative 1: Local (uploads/{logo_path})               │
│    - Tentative 2: Supabase Storage                          │
│    - Si Supabase: téléchargement + sauvegarde temporaire    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Génération PDF avec ReportLab                            │
│    - draw_header_on_canvas() → Logo en haut à droite        │
│    - Contenu du devis (lignes, totaux, etc.)                │
│    - draw_footer_on_canvas() → Pied de page                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Chargement de la Signature Entreprise (si présente)      │
│    - Tentative 1: Local                                     │
│    - Tentative 2: Supabase Storage                          │
│    - Affichage colonne gauche (section signatures)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Chargement de la Signature Client (si présente)          │
│    - Tentative 1: Local (quote.client_signature_path)       │
│    - Tentative 2: Supabase Storage                          │
│    - Affichage colonne droite (section signatures)          │
│    - Zone "Bon pour accord" au-dessus si présente           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Nettoyage des Fichiers Temporaires                       │
│    - Suppression des fichiers > 1h dans temp_logos/         │
│    - Suppression des fichiers > 1h dans temp_signatures/    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Signature Électronique Client

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client accède au devis via token public                  │
│    GET /quotes/public/{token}                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Validation de l'identité (OTP par email)                 │
│    POST /quotes/public/{token}/send-otp                     │
│    - Email doit correspondre au client                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Client dessine sa signature (Canvas HTML5)               │
│    - Export en base64 PNG                                   │
│    - Métadonnées: email, nom, consentement                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Upload de la signature                                   │
│    POST /quotes/{quote_id}/client-signature                 │
│    - Validation email correspond au client                  │
│    - Génération PDF AVANT signature (hash calculé)          │
│    - Décodage base64 → PNG                                  │
│    - Sauvegarde locale: signatures/client_signature_*.png   │
│    - Upload Supabase Storage                                │
│    - Mise à jour quote.client_signature_path                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Génération PDF APRÈS signature                           │
│    - PDF avec signature client incluse                      │
│    - Hash SHA-256 calculé (signature_hash)                  │
│    - Archivage dans signed_quotes/ (immutable)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Enregistrement des métadonnées                           │
│    - QuoteSignature (hash, IP, user-agent, etc.)            │
│    - QuoteSignatureAuditLog (événements)                    │
│    - Mise à jour quote.status = ACCEPTE                     │
│    - Arrêt des relances automatiques                        │
│    - Notification créée                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 6. POINTS IMPORTANTS

### 6.1. Sécurité

- **Signature Client:**
  - Validation stricte de l'email (doit correspondre au client)
  - Consentement explicite requis
  - Hash SHA-256 du PDF avant et après signature
  - Archivage immuable du PDF signé
  - Journal d'audit complet (IP, user-agent, timestamp)
  - OTP par email pour validation d'identité

### 6.2. Formats de Fichiers

- **Logo:** PNG (transparence préservée) ou JPG
- **Signature Entreprise:** Toujours JPEG (compression automatique)
- **Signature Client:** Toujours PNG (depuis canvas HTML5)

### 6.3. Stockage

- **Production:** Supabase Storage (persistant, scalable)
- **Développement:** Stockage local (`uploads/`)
- **Fallback automatique:** Si Supabase non configuré → stockage local

### 6.4. Nettoyage

- Les fichiers temporaires (logos et signatures) sont nettoyés après 1 heure
- Les PDFs archivés sont conservés indéfiniment (audit légal)
- Les anciens fichiers sont supprimés lors du remplacement (logo, signature entreprise)

### 6.5. Chemins dans la Base de Données

- **Logo:** `CompanySettings.settings.company_info.logo_path`
- **Signature Entreprise:** `CompanySettings.settings.billing.quote_design.signature_path`
- **Signature Client:** `Quote.client_signature_path`
- **PDF Signé Archivé:** `QuoteSignature.signed_pdf_path`

---

## 📊 7. RÉSUMÉ DES ENDPOINTS

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/companies/me/logo` | POST | Upload logo entreprise |
| `/companies/me/logo` | GET | Récupérer logo entreprise |
| `/companies/me/logo` | DELETE | Supprimer logo entreprise |
| `/companies/me/signature` | POST | Upload signature entreprise |
| `/companies/me/signature` | GET | Récupérer signature entreprise |
| `/quotes/{quote_id}/client-signature` | POST | Upload signature client (avec métadonnées) |
| `/quotes/public/{token}` | GET | Récupérer devis public (pour signature) |
| `/quotes/public/{token}/send-otp` | POST | Envoyer OTP pour validation email |

---

## 🐛 8. DÉPANNAGE

### Problème: Logo non affiché dans le PDF

**Causes possibles:**
1. Chemin incorrect dans la base de données
2. Fichier non trouvé (local ou Supabase)
3. Format non supporté par ReportLab

**Solution:**
- Vérifier les logs backend pour le chemin utilisé
- Vérifier l'existence du fichier dans `uploads/` ou Supabase Storage
- S'assurer que le format est PNG ou JPEG

### Problème: Signature client non affichée

**Causes possibles:**
1. `quote.client_signature_path` est `None`
2. Fichier non trouvé dans `signatures/`
3. Problème de téléchargement depuis Supabase

**Solution:**
- Vérifier que la signature a bien été uploadée (`QuoteSignature` existe)
- Vérifier le chemin dans `quote.client_signature_path`
- Vérifier l'existence du fichier dans `uploads/{company_id}/signatures/`

### Problème: Transparence PNG perdue

**Cause:** Conversion forcée en JPEG

**Solution:**
- S'assurer que les logos PNG sont uploadés sans conversion
- Le recadrage frontend préserve la transparence pour les PNG

---

## 📝 9. NOTES TECHNIQUES

- **Taille max logo:** 10MB
- **Taille max signature entreprise:** 2MB (compressé automatiquement)
- **Format signature entreprise:** Toujours JPEG (compression automatique)
- **Format signature client:** PNG (depuis canvas HTML5)
- **Permissions:** Owner ou Super Admin pour logo/signature entreprise
- **Temp files cleanup:** 1 heure après création
- **Cache:** Utilisation de `cache-busting` (`?t=${timestamp}`) pour forcer le rechargement

