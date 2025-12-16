# 🔐 Guide de Sécurité pour la Production

## ✅ Corrections Appliquées

### 1. Headers de Sécurité HTTP ✅
- **Frontend**: Configuré dans `next.config.ts`
- **Backend**: Middleware ajouté dans `main.py`
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`

### 2. Validation de la Force des Mots de Passe ✅
- Fonction `validate_password_strength()` dans `backend/app/core/security.py`
- Règles: 8+ caractères, majuscule, minuscule, chiffre
- Appliquée à: inscription et reset de mot de passe

### 3. Rate Limiting ✅
- **Activé** avec `slowapi`
- **Configuré** sur:
  - `/auth/login`: 5 tentatives/minute
  - `/auth/register`: 3 inscriptions/heure
  - `/auth/forgot-password`: 5 demandes/heure

### 4. Gestion des Erreurs ✅
- Stack traces masqués en production
- Messages d'erreur génériques pour les utilisateurs
- Détails loggés côté serveur uniquement

### 5. Audit Logs ✅
- Système créé dans `backend/app/core/audit_log.py`
- Fonction `log_audit_action()` disponible
- Logger les actions critiques (create, update, delete, login)

### 6. Validation Upload ✅
- Déjà en place dans `inbox.py`
- Validation extension + MIME type réel avec `filetype`
- Taille limitée (10 MB)

---

## ⚠️ À Configurer en Production

### 1. HTTPS

**Frontend (Vercel)**:
- ✅ HTTPS est **automatiquement activé** par Vercel en production
- Pas de configuration supplémentaire nécessaire
- Redirection automatique HTTP → HTTPS

**Backend**:
- Si vous hébergez le backend vous-même, configurer un reverse proxy (nginx, Caddy) avec SSL
- Ou utiliser un service cloud avec HTTPS automatique (Railway, Render, etc.)
- Certificat SSL requis (Let's Encrypt gratuit)

### 2. Secrets Management

**⚠️ IMPORTANT**: Ne jamais commiter les `.env` dans Git

**Recommandations**:
1. **Vercel** (Frontend):
   - Utiliser les Variables d'Environnement dans le dashboard Vercel
   - Settings → Environment Variables
   - S'assurer que `NODE_ENV=production`

2. **Backend** (si hébergé):
   - Utiliser les variables d'environnement du service (Railway, Render, etc.)
   - Ou utiliser un gestionnaire de secrets:
     - **AWS Secrets Manager**
     - **HashiCorp Vault**
     - **Azure Key Vault**
     - **Google Secret Manager**

3. **Variables Critiques à Configurer**:
   ```env
   ENVIRONMENT=production
   JWT_SECRET_KEY=<générer une clé sécurisée de 32+ caractères>
   DATABASE_URL=<URL PostgreSQL en production>
   SMTP_USERNAME=<email>
   SMTP_PASSWORD=<mot de passe d'application>
   OPENAI_API_KEY=<clé API OpenAI>
   STRIPE_SECRET_KEY=<clé secrète Stripe>
   ```

4. **Générer JWT_SECRET_KEY**:
   ```bash
   # Option 1: openssl
   openssl rand -hex 32
   
   # Option 2: Python
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   
   # Option 3: Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### 3. Base de Données

**Migration SQLite → PostgreSQL**:
- ⚠️ SQLite n'est **pas recommandé** pour la production
- Migrer vers PostgreSQL:
  1. Créer une base PostgreSQL (Railway, Supabase, AWS RDS, etc.)
  2. Mettre à jour `DATABASE_URL` dans `.env`
  3. Exécuter les migrations Alembic:
     ```bash
     cd backend
     alembic upgrade head
     ```
  4. Migrer les données existantes (si nécessaire)

### 4. Monitoring et Alertes

**Rate Limiting**:
- Les tentatives bloquées sont loggées par `slowapi`
- Configurer des alertes pour:
  - Trop de tentatives de connexion échouées
  - Trop de demandes de reset de mot de passe

**Recommandations**:
- **Sentry** pour le monitoring des erreurs
- **Logtail** ou **Datadog** pour les logs
- **Uptime Robot** pour vérifier la disponibilité

### 5. Backups

**Configuration Requise**:
- Backups **automatiques** quotidiens de la base de données
- Backups **chiffrés** (si données sensibles)
- Stockage des backups sur un autre serveur/location
- Test de restauration régulier

**Solutions**:
- PostgreSQL: pg_dump automatique (cron job)
- Services cloud: Backups automatiques (Railway, Supabase, etc.)

### 6. Content Security Policy (CSP)

**Statut**: ⚠️ Non implémenté (peut casser certaines fonctionnalités)

**Recommandation**:
- Implémenter progressivement si nécessaire
- Tester après chaque modification
- Peut bloquer certaines intégrations (chatbots, widgets tiers)

### 7. Tokens en Cookies HttpOnly

**Statut Actuel**: Tokens JWT dans `localStorage`

**Optionnel mais Recommandé**:
- Migrer vers des cookies `HttpOnly` pour plus de sécurité
- Réduit le risque XSS (les scripts ne peuvent pas lire les cookies HttpOnly)
- Nécessite des modifications backend et frontend

---

## 📋 Checklist de Déploiement Production

### Backend

- [x] Headers de sécurité configurés
- [x] Rate limiting activé sur `/auth/login` et `/auth/register`
- [x] Validation de la force des mots de passe
- [x] Gestion des erreurs (stack traces masqués)
- [x] Audit logs système créé
- [ ] **HTTPS configuré** (selon votre hébergement)
- [ ] **JWT_SECRET_KEY généré** (clé sécurisée de 32+ caractères)
- [ ] **DATABASE_URL PostgreSQL** configuré
- [ ] **Toutes les clés API** configurées (OpenAI, Stripe, SMTP)
- [ ] **ENVIRONMENT=production** dans les variables d'environnement
- [ ] **Backups automatiques** configurés
- [ ] **Monitoring** configuré (Sentry, etc.)

### Frontend

- [x] Headers de sécurité configurés dans `next.config.ts`
- [x] `console.log` conditionnés avec `logger`
- [ ] **Variables d'environnement** configurées dans Vercel
- [ ] **HTTPS** vérifié (automatique sur Vercel)
- [ ] **Domain** configuré (`lokario.fr`)

### Général

- [ ] **Tests de sécurité** effectués:
  - Test IDOR (accès à des ressources d'autres entreprises)
  - Test rate limiting
  - Test validation des entrées
- [ ] **Documentation** à jour
- [ ] **Plan de rollback** préparé

---

## 🔍 Tests de Sécurité Recommandés

### 1. Test IDOR

```bash
# 1. Créer 2 comptes (Company A et Company B)
# 2. Se connecter avec Company A
# 3. Créer une facture dans Company A → ID 123
# 4. Se connecter avec Company B
# 5. Essayer d'accéder à GET /invoices/123
# ✅ Résultat attendu: 404 Not Found (pas 200 OK)
```

### 2. Test Rate Limiting

```bash
# Tester /auth/login avec 10 tentatives en 1 minute
# ✅ Résultat attendu: Bloqué après 5 tentatives (429 Too Many Requests)
```

### 3. Test Validation Mots de Passe

```bash
# Tester inscription avec mots de passe faibles:
# - "12345" → ❌ Rejeté (trop court)
# - "abcdefgh" → ❌ Rejeté (pas de majuscule/chiffre)
# - "Abcdefgh1" → ✅ Accepté
```

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Dernière mise à jour**: $(date)
