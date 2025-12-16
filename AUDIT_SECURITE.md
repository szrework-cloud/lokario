# 🔐 Audit de Sécurité - Lokario

**Date**: $(date)  
**Version**: 0.1.0  
**Statut**: ⚠️ BONNE BASE, AMÉLIORATIONS RECOMMANDÉES

---

## 📋 Résumé Exécutif

L'application présente une **bonne base de sécurité** avec plusieurs bonnes pratiques en place (bcrypt, JWT, SQLAlchemy ORM, validation Pydantic). Cependant, plusieurs **améliorations critiques** sont recommandées avant la mise en production.

---

## ✅ Points Positifs

### 1. Authentification & Hashage
- ✅ **Mots de passe hashés avec bcrypt** (`backend/app/core/security.py`)
- ✅ **JWT avec expiration** (1 jour par défaut)
- ✅ **Validation du secret JWT** en production (pas de valeur par défaut)
- ✅ **OAuth2PasswordBearer** utilisé pour l'authentification

### 2. Protection contre les injections SQL
- ✅ **SQLAlchemy ORM** utilisé partout (pas de requêtes SQL brutes)
- ✅ **Paramètres liés** automatiquement (protection contre SQL injection)

### 3. Validation des Entrées
- ✅ **Pydantic schemas** pour validation des données
- ✅ **Validation des types** automatique

### 4. Logging Sécurisé
- ✅ **Log sanitizer** implémenté (`backend/app/core/log_sanitizer.py`)
- ✅ Masquage automatique des mots de passe, tokens, secrets dans les logs

### 5. Upload de Fichiers
- ✅ **Validation des extensions** autorisées
- ✅ **Validation des MIME types**
- ✅ **Limite de taille** (10 MB)

---

## 🔴 CRITIQUE - À Corriger Avant Production

### 1. Autorisation - Vérification company_id

**Problème**: Risque de **IDOR (Insecure Direct Object Reference)**

**Description**: Il faut vérifier que tous les endpoints qui accèdent aux ressources par ID vérifient que l'utilisateur a bien accès à ces ressources via `company_id`.

**Exemple Risqué**:
```python
@router.get("/clients/{client_id}")
def get_client(client_id: int, current_user: User = Depends(get_current_active_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    # ⚠️ Pas de vérification que client.company_id == current_user.company_id
    return client
```

**Solution Recommandée**:
```python
@router.get("/clients/{client_id}")
def get_client(
    client_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == current_user.company_id  # ✅ Vérification
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client
```

**Action Requise**: 
- ⚠️ **Audit complet** de tous les endpoints pour s'assurer qu'ils filtrent par `company_id`
- ⚠️ Vérifier les routes : `/clients/*`, `/invoices/*`, `/quotes/*`, `/projects/*`, `/tasks/*`, etc.

---

### 2. Headers de Sécurité HTTP

**Problème**: Pas de headers de sécurité configurés

**Impact**: Vulnérable aux attaques XSS, clickjacking, etc.

**Solution**: Ajouter des headers de sécurité

**Frontend (next.config.ts)**:
```typescript
const nextConfig: NextConfig = {
  images: { unoptimized: false },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};
```

**Backend (FastAPI)**:
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

**Action Requise**: ⚠️ **Implémenter ces headers avant la production**

---

### 3. Rate Limiting

**Problème**: Aucun rate limiting configuré

**Impact**: Vulnérable aux attaques par force brute et DoS

**Statut Actuel**: Code commenté dans `backend/app/main.py`:
```python
# Configuration du rate limiting (désactivé pour les endpoints API)
# limiter = Limiter(key_func=get_remote_address)
```

**Solution Recommandée**:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Appliquer sur les endpoints critiques
@router.post("/auth/login")
@limiter.limit("5/minute")  # 5 tentatives par minute
def login(request: Request, ...):
    ...
```

**Action Requise**: ⚠️ **Activer et configurer le rate limiting**

---

### 4. Validation Force des Mots de Passe

**Problème**: Pas de validation de la force des mots de passe à l'inscription

**Fichier**: `backend/app/api/routes/auth.py`

**Solution Recommandée**:
```python
import re

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Valide la force d'un mot de passe.
    Retourne (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    
    if not re.search(r'[A-Z]', password):
        return False, "Le mot de passe doit contenir au moins une majuscule"
    
    if not re.search(r'[a-z]', password):
        return False, "Le mot de passe doit contenir au moins une minuscule"
    
    if not re.search(r'\d', password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    
    return True, ""

# Dans la fonction register():
is_valid, error = validate_password_strength(user_data.password)
if not is_valid:
    raise HTTPException(status_code=400, detail=error)
```

**Action Requise**: ⚠️ **Ajouter validation de la force des mots de passe**

---

### 5. CSRF Protection

**Problème**: Pas de protection CSRF explicite

**Impact**: Vulnérable aux attaques CSRF

**Solution**:
- Pour les formulaires, utiliser des tokens CSRF
- Pour les APIs REST avec JWT dans Authorization header, moins critique mais recommandé
- Next.js gère partiellement CSRF, mais vérifier les endpoints critiques

**Action Requise**: ⚠️ **Évaluer si CSRF protection est nécessaire** (selon votre architecture)

---

## 🟡 IMPORTANT - À Améliorer

### 6. Stockage des Tokens (Frontend)

**Problème**: Tokens JWT stockés dans `localStorage`

**Fichiers Affectés**:
- `src/store/auth-store.ts`: `localStorage.setItem("auth_token", token)`
- `src/lib/api.ts`: `localStorage.getItem("auth_token")`

**Risque**: 
- XSS peut voler les tokens depuis localStorage
- localStorage accessible à tous les scripts de la page

**Recommandation**:
- ⚠️ Considérer `httpOnly cookies` pour les tokens (nécessite modifications backend)
- ⚠️ Ou utiliser `sessionStorage` (plus sûr que localStorage, effacé à la fermeture)
- ⚠️ Ou implémenter `HttpOnly` cookies côté serveur

**Compromis Actuel Acceptable**:
- Si vous gardez localStorage, s'assurer qu'il n'y a pas de XSS
- Headers de sécurité XSS-Protection aident
- Next.js SSR réduit les risques

---

### 7. Validation des Uploads de Fichiers

**Statut**: ✅ Partiellement sécurisé

**Améliorations Recommandées**:

```python
# Ajouter validation du contenu réel du fichier
import magic  # python-magic
import filetype

def validate_file_content(file_content: bytes, filename: str) -> bool:
    # Vérifier le type réel du fichier
    detected_type = filetype.guess(file_content)
    if not detected_type:
        return False
    
    # Vérifier que le type détecté correspond à l'extension
    allowed_mimes = settings.ALLOWED_MIME_TYPES
    if detected_type.mime not in allowed_mimes:
        return False
    
    # Vérifier la taille
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        return False
    
    return True
```

**Action Requise**: ⚠️ **Ajouter validation du contenu réel des fichiers**

---

### 8. Secrets dans le Code Source

**Statut**: ✅ Bonne pratique - Tous les secrets dans `.env`

**Vérifications**:
- ✅ Aucun secret hardcodé trouvé dans le code
- ✅ `.env*` dans `.gitignore`
- ✅ Variables d'environnement utilisées partout

**Recommandation**: 
- ✅ Continuer à ne JAMAIS commiter les `.env`
- ⚠️ En production, utiliser un gestionnaire de secrets (AWS Secrets Manager, Vault, etc.)

---

### 9. Gestion des Erreurs

**Statut**: ⚠️ À améliorer

**Problème Potentiel**: Certaines erreurs peuvent exposer des informations sensibles

**Solution**: S'assurer que les erreurs en production ne contiennent pas de stack traces

**Déjà en place**:
- ✅ `log_sanitizer.py` masque les données sensibles dans les logs
- ✅ FastAPI gère les erreurs avec des messages génériques

**Amélioration Recommandée**:
```python
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # En production, ne pas exposer les détails
    if settings.ENVIRONMENT == "production":
        logger.error(f"Error: {exc}", exc_info=True)  # Logger pour debug
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    # En développement, montrer plus de détails
    ...
```

---

### 10. CORS

**Statut**: ✅ Corrigé dans l'audit précédent

**Configuration Actuelle**:
- ✅ Détection automatique de l'environnement
- ✅ URLs de production configurées
- ⚠️ `allow_credentials=True` - S'assurer que c'est sécurisé avec les bonnes origines

**Recommandation**: 
- ✅ CORS bien configuré
- ⚠️ Vérifier que `allow_credentials=True` est nécessaire (si vous utilisez des cookies)

---

### 11. XSS (Cross-Site Scripting)

**Protection Actuelle**:
- ✅ React échappe automatiquement les valeurs
- ✅ Pas de `dangerouslySetInnerHTML` trouvé (sauf 1 dans un composant landing qui semble sûr)

**Recommandation**:
- ✅ Continuer à éviter `dangerouslySetInnerHTML`
- ✅ Ajouter les headers de sécurité XSS mentionnés ci-dessus

---

### 12. Validation des Paramètres d'URL

**Problème Potentiel**: Paramètres d'URL non validés

**Exemple**: 
```python
@router.get("/clients/{client_id}")
def get_client(client_id: int, ...):  # ✅ Type int validé automatiquement par FastAPI
```

**Statut**: ✅ FastAPI valide automatiquement les types, mais vérifier les validations métier

---

## 🟢 BONNES PRATIQUES DÉJÀ EN PLACE

### 13. JWT Expiration
- ✅ Tokens expirent après 1 jour (configurable)
- ✅ Vérification de l'expiration dans `get_current_user`

### 14. Utilisateurs Inactifs
- ✅ Vérification `is_active` dans `get_current_active_user`
- ✅ Les utilisateurs inactifs ne peuvent pas se connecter

### 15. Rôles et Permissions
- ✅ Système de rôles (super_admin, owner, user)
- ✅ Dépendances pour vérifier les rôles
- ⚠️ Vérifier que tous les endpoints utilisent ces dépendances

### 16. SQL Injection
- ✅ **Protection complète** grâce à SQLAlchemy ORM
- ✅ Aucune requête SQL brute trouvée

---

## 📝 Checklist de Sécurité pour Production

### Backend

- [x] **AUDIT COMPLET**: Vérifier que tous les endpoints filtrent par `company_id` ✅
- [x] **Rate Limiting**: Activer et configurer sur les endpoints critiques ✅
  - `/auth/login`: 5 tentatives/minute ✅
  - `/auth/register`: 3 tentatives/heure ✅
  - `/auth/forgot-password`: 5 demandes/heure ✅
- [x] **Headers de Sécurité**: Ajouter middleware pour headers HTTP sécurisés ✅
- [x] **Validation Mots de Passe**: Ajouter validation de force (8+ chars, majuscule, minuscule, chiffre) ✅
- [x] **Upload Sécurisé**: Validation du contenu réel des fichiers (déjà en place dans inbox.py) ✅
- [x] **Gestion Erreurs**: S'assurer qu'aucun stack trace n'est exposé en production ✅
- [ ] **HTTPS**: Forcer HTTPS en production (géré par Vercel pour frontend)
- [ ] **Secrets Management**: Utiliser un gestionnaire de secrets en production

### Frontend

- [x] **Headers de Sécurité**: Configurer dans `next.config.ts` ✅
- [ ] **CSP (Content Security Policy)**: Considérer l'ajout (peut casser certaines fonctionnalités)
- [x] **HTTPS**: Vérifier que Vercel force HTTPS (automatique) ✅
- [ ] **Tokens**: Considérer migration vers httpOnly cookies (optionnel mais recommandé)

### Général

- [ ] **Tests de Sécurité**: 
  - Tests d'autorisation (IDOR) - Voir GUIDE_SECURITE_PRODUCTION.md
  - Tests de rate limiting - Voir GUIDE_SECURITE_PRODUCTION.md
  - Tests de validation des entrées - Voir GUIDE_SECURITE_PRODUCTION.md
- [ ] **Monitoring**: Configurer alertes pour tentatives de force brute (recommandé)
- [ ] **Backups**: S'assurer que les backups sont chiffrés (à configurer selon hébergement)
- [x] **Audit Logs**: Logger toutes les actions critiques (création/modification/suppression) - Système créé dans `backend/app/core/audit_log.py` ✅

---

## 🔍 Tests de Sécurité Recommandés

### 1. Test IDOR (Insecure Direct Object Reference)

**Scénario**:
1. Créer 2 comptes (Company A et Company B)
2. Se connecter avec Company A
3. Essayer d'accéder à un client de Company B via: `GET /clients/{client_id_of_company_b}`
4. **Résultat attendu**: 404 ou 403, PAS les données du client

**Action**: ⚠️ **Tester tous les endpoints** de cette manière

---

### 2. Test Rate Limiting

**Scénario**:
1. Essayer de se connecter 10 fois avec un mauvais mot de passe en 1 minute
2. **Résultat attendu**: Bloqué après 5 tentatives

**Action**: ⚠️ **Activer et tester le rate limiting**

---

### 3. Test Validation des Entrées

**Scénario**:
1. Essayer d'insérer des scripts XSS dans les champs texte
2. Essayer d'uploader un fichier avec extension `.jpg` mais contenu malveillant
3. **Résultat attendu**: Rejet ou échappement des données

**Action**: ⚠️ **Tester les validations**

---

## 📊 Score de Sécurité

| Catégorie | Score | Notes |
|-----------|-------|-------|
| Authentification | 🟢 8/10 | Bcrypt, JWT bien implémentés, manque validation force mdp |
| Autorisation | 🟡 6/10 | Système de rôles OK, mais vérifier IDOR partout |
| Protection Injection | 🟢 9/10 | SQLAlchemy protège bien, Pydantic valide |
| XSS Protection | 🟢 8/10 | React échappe, manque headers sécurité |
| CSRF Protection | 🟡 5/10 | Pas explicite, dépend de l'architecture |
| Rate Limiting | 🔴 3/10 | Désactivé, à activer |
| Headers Sécurité | 🔴 2/10 | Pas configurés |
| Gestion Erreurs | 🟡 6/10 | Bonne base, améliorer pour production |
| Upload Sécurité | 🟡 7/10 | Bonne base, ajouter validation contenu |
| Logging Sécurisé | 🟢 9/10 | Excellent, log sanitizer en place |

**Score Global**: 🟡 **6.3/10** - Bonne base, améliorations nécessaires

---

## 🚨 Priorités Avant Production

### Priorité 1 (CRITIQUE)
1. ⚠️ **Audit IDOR**: Vérifier tous les endpoints filtrent par `company_id`
2. ⚠️ **Rate Limiting**: Activer sur `/auth/login` et `/auth/register`
3. ⚠️ **Headers de Sécurité**: Ajouter X-Content-Type-Options, X-Frame-Options, etc.

### Priorité 2 (IMPORTANT)
4. ⚠️ **Validation Force Mots de Passe**: Ajouter règles de complexité
5. ⚠️ **Upload Validation**: Vérifier contenu réel des fichiers
6. ⚠️ **Gestion Erreurs**: Masquer stack traces en production

### Priorité 3 (RECOMMANDÉ)
7. ⚠️ **Tokens en Cookies**: Considérer httpOnly cookies pour tokens
8. ⚠️ **CSP Headers**: Considérer Content Security Policy
9. ⚠️ **Monitoring**: Alertes pour tentatives de force brute

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Conclusion**: L'application a une **bonne base de sécurité**, mais nécessite des **améliorations critiques** avant la production, notamment pour l'autorisation (IDOR), le rate limiting, et les headers de sécurité.
