# 🔍 Audit de Production - Lokario

**Date**: $(date)  
**Version**: 0.1.0  
**Statut**: ⚠️ PRÊT AVEC RÉSERVES

---

## 📋 Résumé Exécutif

Cette application est **presque prête pour la production**, mais nécessite des ajustements critiques avant le déploiement, notamment pour la sécurité, la configuration CORS, et le nettoyage du code.

---

## 🔴 CRITIQUE - À Corriger Avant Production

### 1. Configuration CORS (Backend)

**Fichier**: `backend/app/main.py`

**Problème**: Les URLs de production ne sont pas configurées dans CORS.

```python
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    # ⚠️ URLs de production commentées
    # "https://www.lokario.fr",
    # "https://lokario.fr",
]
```

**Action Requise**:
- ✅ Décommenter et ajouter les URLs de production
- ✅ Utiliser une variable d'environnement pour les origines en développement
- ✅ S'assurer que `allow_credentials=True` est sécurisé avec les bonnes origines

**Code Recommandé**:
```python
import os

# Déterminer les origines en fonction de l'environnement
if settings.ENVIRONMENT == "production":
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
```

---

### 2. Variables d'Environnement Critiques

**Fichier**: `backend/.env` (à créer/configurer en production)

**Variables Requises**:
- ⚠️ `JWT_SECRET_KEY` - DOIT être changé de la valeur par défaut
- ⚠️ `ENVIRONMENT=production` - Définir explicitement
- ⚠️ `DATABASE_URL` - Configurer la base de données de production (PostgreSQL recommandé)
- ⚠️ `FRONTEND_URL` - Mettre à jour avec l'URL de production
- ⚠️ `SMTP_*` - Vérifier que tous les paramètres SMTP sont corrects
- ⚠️ `STRIPE_*` - S'assurer d'utiliser les clés de production Stripe (pas de test)

**Action Requise**:
```bash
# Vérifier que JWT_SECRET_KEY n'est PAS la valeur par défaut
# Vérifier que toutes les clés API sont des clés de PRODUCTION
# Ne JAMAIS commit le fichier .env en production
```

---

### 3. Base de Données

**Statut Actuel**: SQLite (par défaut)

**Recommandation**:
- ⚠️ **Migrer vers PostgreSQL** pour la production
- SQLite n'est pas adapté pour la production (concurrence limitée, pas de réseau)
- Configurer `DATABASE_URL=postgresql://user:password@host:port/dbname`

**Action Requise**:
1. Créer une base PostgreSQL en production
2. Exécuter les migrations Alembic sur la base de production
3. Tester la migration avant le déploiement

---

### 4. Sécurité - Secrets Hardcodés

**Fichier**: `backend/app/core/config.py`

**Problème Potentiel**: Vérifier qu'aucun secret n'est hardcodé dans le code.

**Vérifications**:
- ✅ JWT_SECRET_KEY utilise une valeur par défaut seulement en dev
- ✅ Tous les secrets sont chargés depuis les variables d'environnement
- ⚠️ Vérifier qu'aucune clé API n'est dans le code source

**Action Requise**: 
- Audit complet du code source pour chercher des secrets
- Utiliser un gestionnaire de secrets (ex: Vault, AWS Secrets Manager) en production

---

## 🟡 IMPORTANT - À Améliorer

### 5. Logs Console (Frontend)

**Problème**: 326 occurrences de `console.log/debug/error/warn` dans le code frontend

**Fichiers Principaux**:
- `src/app/app/inbox/page.tsx`: 22 logs
- `src/app/app/settings/page.tsx`: 26 logs
- `src/app/app/projects/page.tsx`: 16 logs
- Et 70+ autres fichiers

**Action Requise**:
- ⚠️ Supprimer ou remplacer les `console.log` en production
- Utiliser un système de logging professionnel
- Garder seulement les `console.error` pour les erreurs critiques

**Solution Recommandée**:
```typescript
// Créer un système de logging conditionnel
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args); // Toujours logger les erreurs
  }
};
```

---

### 6. TODOs dans le Code

**Problème**: 50+ TODO/FIXME dans le code source

**Exemples Critiques**:
- `src/app/app/settings/page.tsx:1922` - TODO: Remplacer par ConfirmModal (déjà fait partiellement)
- `src/app/app/billing/quotes/new/page.tsx:297` - TODO: Uploader les fichiers attachés
- `src/app/app/billing/invoices/[id]/page.tsx:69` - TODO: Récupérer timeline depuis l'API

**Action Requise**:
- ⚠️ Documenter les TODOs critiques
- Créer des issues/tickets pour les fonctionnalités manquantes
- Marquer les TODOs non critiques comme "future enhancement"

---

### 7. Configuration FRONTEND_URL

**Problème**: Plusieurs fallbacks hardcodés à `localhost:3000`

**Fichiers Affectés**:
- `backend/app/api/routes/tasks.py` (3 occurrences)
- `backend/app/api/routes/appointments.py` (3 occurrences)
- `backend/app/api/routes/followups.py` (6 occurrences)
- `backend/app/api/routes/invoices.py` (2 occurrences)
- `backend/app/api/routes/quotes.py` (1 occurrence)

**Action Requise**:
- ⚠️ S'assurer que `FRONTEND_URL` est toujours défini en production
- Retirer les fallbacks `localhost` (ou les remplacer par une erreur)

---

### 8. Gestion des Erreurs Backend

**Statut**: À vérifier

**Action Requise**:
- ⚠️ S'assurer que toutes les erreurs sensibles ne sont pas exposées au client
- Vérifier que les stack traces ne sont pas retournées en production
- Implémenter un logging centralisé des erreurs

---

## 🟢 BONNES PRATIQUES - À Vérifier

### 9. Configuration Next.js

**Fichier**: `next.config.ts`

**Statut**: ✅ Basique mais correct

**Recommandations**:
- Ajouter des optimisations de production
- Configurer les headers de sécurité
- Ajouter la compression

**Exemple**:
```typescript
const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
  },
  // Ajouter en production
  compress: true,
  poweredByHeader: false,
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
        ],
      },
    ];
  },
};
```

---

### 10. .gitignore

**Statut**: ✅ Correct - `.env*` est bien ignoré

**Vérifications**:
- ✅ Les fichiers .env ne sont pas trackés
- ⚠️ Vérifier que les backups (.env.bak, .env.tmp) ne sont pas commités

---

### 11. Dépendances

**Frontend**:
- ✅ Next.js 16.0.4 (récent)
- ✅ React 19.2.0 (dernière version)
- ⚠️ Vérifier les vulnérabilités: `npm audit`

**Backend**:
- ✅ FastAPI 0.115.0 (récent)
- ✅ SQLAlchemy 2.0.36 (récent)
- ⚠️ Vérifier les vulnérabilités: `pip audit` ou `safety check`

**Action Requise**:
```bash
# Frontend
npm audit
npm audit fix

# Backend
pip install safety
safety check
```

---

### 12. Migrations Alembic

**Statut**: ✅ Alembic configuré avec 20+ migrations

**Action Requise**:
- ⚠️ Vérifier que toutes les migrations sont testées
- S'assurer que `init_db()` ne crée pas de conflits avec Alembic
- Documenter le processus de migration en production

---

## ✅ Points Positifs

1. ✅ **Sécurité JWT**: Validation en place pour empêcher l'utilisation de la clé par défaut en production
2. ✅ **Système de Toast**: Implémenté pour remplacer les alert() natifs
3. ✅ **Gestion des Erreurs**: Structure d'erreur cohérente dans le frontend
4. ✅ **TypeScript**: Typage fort utilisé partout
5. ✅ **Configuration SMTP**: Validation et logging au démarrage
6. ✅ **Structure du Code**: Bien organisé avec séparation frontend/backend

---

## 📝 Checklist de Déploiement

### Backend

- [ ] Configurer `ENVIRONMENT=production` dans `.env`
- [ ] Générer un `JWT_SECRET_KEY` sécurisé (min 32 caractères aléatoires)
- [ ] Configurer `DATABASE_URL` avec PostgreSQL
- [ ] Mettre à jour `FRONTEND_URL` avec l'URL de production
- [ ] Configurer les URLs CORS pour la production
- [ ] Vérifier toutes les clés API (Stripe, OpenAI, SMTP) sont en mode production
- [ ] Exécuter les migrations Alembic sur la base de production
- [ ] Tester la connexion à la base de données
- [ ] Tester l'envoi d'emails SMTP
- [ ] Vérifier les permissions de fichiers (`uploads/` directory)
- [ ] Configurer le logging (centralisé en production)
- [ ] Désactiver le mode debug dans FastAPI

### Frontend

- [ ] Configurer `NEXT_PUBLIC_API_URL` avec l'URL du backend de production
- [ ] Vérifier que le build passe: `npm run build`
- [ ] Tester le build localement: `npm run start`
- [ ] Configurer les variables d'environnement sur Vercel
- [ ] Configurer le domaine (lokario.fr) dans Vercel
- [ ] Vérifier que les assets statiques se chargent correctement
- [ ] Tester l'authentification complète
- [ ] Tester les fonctionnalités critiques (factures, devis, etc.)

### Sécurité

- [ ] Audit de sécurité du code source
- [ ] Vérifier qu'aucun secret n'est commité
- [ ] Configurer HTTPS (géré automatiquement par Vercel)
- [ ] Vérifier les headers de sécurité
- [ ] Tester la protection CSRF (si applicable)
- [ ] Vérifier les limites de rate limiting
- [ ] Audit des dépendances pour vulnérabilités

### Tests

- [ ] Tests de connexion API
- [ ] Tests d'authentification
- [ ] Tests des fonctionnalités critiques
- [ ] Tests de performance (chargement des pages)
- [ ] Tests sur différents navigateurs
- [ ] Tests sur mobile

---

## 🚨 Points d'Attention Post-Déploiement

1. **Monitoring**: Configurer un système de monitoring (ex: Sentry pour les erreurs)
2. **Backups**: Mettre en place des backups automatiques de la base de données
3. **Logs**: Configurer la rotation des logs
4. **Performance**: Monitorer les temps de réponse API
5. **Uptime**: Configurer un monitoring d'uptime (ex: UptimeRobot)

---

## 📞 Support & Documentation

- Documentation déploiement: `DEPLOY.md`
- Backend restart guide: `backend/REDEMARRER_BACKEND.md`
- Configuration Stripe: `INTEGRATION_STRIPE.md`

---

**Conclusion**: Le projet est **presque prêt** pour la production, mais nécessite des ajustements critiques, notamment:
1. Configuration CORS pour production
2. Migration vers PostgreSQL
3. Configuration correcte des variables d'environnement
4. Nettoyage des logs console en production

**Recommandation**: Effectuer ces corrections avant le déploiement en production.
