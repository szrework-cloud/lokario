# 🔒 Audit de Sécurité - Module Inbox

## ⚠️ FAILLES CRITIQUES IDENTIFIÉES

### 1. 🔴 CRITIQUE : Webhooks non sécurisés

**Fichier :** `backend/app/api/routes/inbox_webhooks.py`

**Problème :**
- Les webhooks email et SMS n'ont **AUCUNE authentification**
- N'importe qui peut envoyer des emails/SMS factices
- Le code de vérification de signature est commenté (ligne 81-83)

**Impact :**
- Injection de conversations frauduleuses
- Spam dans l'inbox
- Attaque par déni de service

**Solution :**
```python
# Décommenter et activer la vérification de signature
if not verify_webhook_signature(body, x_webhook_signature, settings.WEBHOOK_SECRET):
    raise HTTPException(status_code=401, detail="Invalid webhook signature")
```

---

### 2. 🔴 CRITIQUE : Mots de passe stockés en clair

**Fichier :** `backend/app/api/routes/inbox_integrations.py` (lignes 392-396)

**Problème :**
- Les mots de passe email (`email_password`) sont stockés **en clair** dans la base de données
- Les API keys sont stockées **en clair**
- TODO commenté mais pas implémenté

**Impact :**
- Si la base de données est compromise, tous les mots de passe sont exposés
- Violation RGPD (données sensibles non chiffrées)

**Solution :**
- Utiliser un chiffrement symétrique (AES-256) avec une clé stockée dans les variables d'environnement
- Ou utiliser un service de gestion de secrets (AWS Secrets Manager, HashiCorp Vault)

---

### 3. 🟠 ÉLEVÉ : Pas de rate limiting

**Problème :**
- Aucun rate limiting sur les endpoints
- Risque d'abus :
  - Création massive de conversations
  - Upload de fichiers en masse
  - Génération de réponses IA (coûteux)

**Impact :**
- Déni de service (DoS)
- Coûts API OpenAI élevés
- Surcharge serveur

**Solution :**
- Ajouter `slowapi` ou `fastapi-limiter`
- Limiter par utilisateur/IP :
  - 10 requêtes/minute pour les endpoints généraux
  - 5 requêtes/minute pour génération IA
  - 20 uploads/heure

---

### 4. 🟠 ÉLEVÉ : Validation insuffisante des uploads

**Fichier :** `backend/app/api/routes/inbox.py` (ligne 1016-1021)

**Problème :**
- Validation uniquement par extension (facilement contournable)
- Pas de vérification du MIME type réel
- Pas de scan antivirus
- Pas de validation du contenu du fichier

**Impact :**
- Upload de fichiers malveillants (virus, scripts)
- Upload de fichiers avec extension falsifiée
- Stockage de contenu illégal

**Solution :**
```python
# Vérifier le MIME type réel
import magic
real_mime = magic.from_buffer(file_content, mime=True)
if real_mime not in ALLOWED_MIME_TYPES:
    raise HTTPException(...)

# Limiter la taille
# Scanner avec ClamAV ou VirusTotal API
```

---

### 5. 🟠 ÉLEVÉ : Path Traversal potentiel

**Fichier :** `backend/app/api/routes/inbox.py` (ligne 1058-1064)

**Problème :**
- Protection basique contre `..` mais pas exhaustive
- Pas de validation stricte du chemin
- Risque si `company_id` peut être manipulé

**Impact :**
- Accès à des fichiers d'autres entreprises
- Fuite de données

**Solution :**
```python
# Validation stricte
safe_path = Path(file_path).resolve()
if not str(safe_path).startswith(str(UPLOAD_DIR / str(current_user.company_id))):
    raise HTTPException(...)
```

---

### 6. 🟡 MOYEN : Pas de validation XSS côté backend

**Problème :**
- Le contenu des messages n'est pas échappé/sanitisé côté backend
- Risque si le frontend ne fait pas d'échappement

**Impact :**
- Injection XSS si le frontend affiche du HTML non échappé
- Vol de session, redirection malveillante

**Solution :**
- Échapper HTML côté backend avant stockage
- Ou valider que le frontend échappe toujours (React le fait par défaut, mais vérifier)

---

### 7. 🟡 MOYEN : Exposition de company_code dans webhooks

**Fichier :** `backend/app/api/routes/inbox_webhooks.py` (ligne 86-93)

**Problème :**
- Le `company_code` est utilisé pour identifier l'entreprise
- Si ce code est devinable/prévisible, n'importe qui peut créer des conversations

**Impact :**
- Injection de conversations frauduleuses
- Spam

**Solution :**
- Utiliser un token secret unique par entreprise
- Ou authentifier le webhook avec signature HMAC

---

### 8. 🟡 MOYEN : Pas de validation des permissions sur les dossiers

**Fichier :** `backend/app/api/routes/inbox.py` (routes folders)

**Problème :**
- Vérification que l'utilisateur peut modifier les dossiers (owner/super_admin) mais pas toujours cohérente
- Risque de modification de dossiers système

**Impact :**
- Modification non autorisée de dossiers
- Suppression accidentelle de dossiers système

**Solution :**
- Vérifier systématiquement `folder.is_system` avant modification
- Ajouter des permissions granulaires

---

### 9. 🟡 MOYEN : Logs avec données sensibles

**Problème :**
- Les logs peuvent contenir des mots de passe, tokens, etc.
- Pas de masquage systématique

**Impact :**
- Exposition de secrets dans les logs
- Fuite de données si logs accessibles

**Solution :**
- Masquer systématiquement les secrets dans les logs
- Utiliser un logger qui masque automatiquement

---

### 10. 🟢 FAIBLE : Pas de CSRF protection explicite

**Problème :**
- Pas de tokens CSRF explicites
- FastAPI a une protection basique mais pas complète

**Impact :**
- Attaques CSRF possibles si utilisateur authentifié visite un site malveillant

**Solution :**
- Ajouter des tokens CSRF pour les actions critiques (suppression, modification)

---

## ✅ POINTS POSITIFS

1. **Isolation par company_id** : Bien implémenté, toutes les requêtes filtrent par `company_id`
2. **Authentification requise** : Tous les endpoints nécessitent `get_current_active_user`
3. **SQLAlchemy ORM** : Protection contre injection SQL
4. **Validation des chemins** : Protection basique contre path traversal
5. **Limite de taille fichiers** : `MAX_UPLOAD_SIZE` configuré

---

## 📋 PLAN D'ACTION PRIORITAIRE

### Priorité 1 (CRITIQUE - À corriger immédiatement)
1. ✅ Sécuriser les webhooks (signature HMAC)
2. ✅ Chiffrer les mots de passe en base
3. ✅ Ajouter rate limiting

### Priorité 2 (ÉLEVÉ - À corriger rapidement)
4. ✅ Améliorer validation uploads (MIME type réel)
5. ✅ Renforcer protection path traversal
6. ✅ Valider/sanitiser contenu messages

### Priorité 3 (MOYEN - À planifier)
7. ✅ Sécuriser company_code dans webhooks
8. ✅ Vérifier permissions dossiers
9. ✅ Masquer secrets dans logs
10. ✅ Ajouter protection CSRF

---

## 🔧 RECOMMANDATIONS GÉNÉRALES

1. **Audit de sécurité régulier** : Faire un audit tous les 3-6 mois
2. **Tests de pénétration** : Faire tester par un expert externe avant production
3. **Monitoring** : Surveiller les tentatives d'intrusion
4. **Backup chiffré** : S'assurer que les backups sont chiffrés
5. **HTTPS obligatoire** : En production, forcer HTTPS partout
6. **Headers de sécurité** : Ajouter CSP, HSTS, X-Frame-Options

