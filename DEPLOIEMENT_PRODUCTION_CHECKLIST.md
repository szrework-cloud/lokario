# ✅ Checklist Déploiement Production

## 📋 Variables d'environnement à ajouter/modifier

### Backend (Railway Production)

**Variables NOUVELLES à ajouter :**

```bash
# ⚠️ NOUVELLE : Configuration Vonage (compte centralisé SMS)
VONAGE_API_KEY=votre-api-key-vonage
VONAGE_API_SECRET=votre-api-secret-vonage

# ⚠️ NOUVELLE : Clé de chiffrement (si pas déjà configuré)
ENCRYPTION_MASTER_KEY=votre-clé-secure-min-32-caractères
```

**Générer ENCRYPTION_MASTER_KEY :**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Variables existantes à vérifier :**
- `ENVIRONMENT=production` (doit être "production")
- `DATABASE_URL` (URL de la DB de production)
- `JWT_SECRET_KEY` (doit être différent de staging)
- `FRONTEND_URL=https://lokario.fr` (ou votre domaine de production)
- `OPENAI_API_KEY` (si utilisé)
- `STRIPE_SECRET_KEY` (clés LIVE en production)
- `STRIPE_PUBLISHABLE_KEY` (clés LIVE en production)
- `STRIPE_WEBHOOK_SECRET`
- Autres variables existantes...

---

## 🗄️ Migrations de base de données à appliquer

### Étape 1 : Vérifier l'état actuel des migrations

```bash
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# Définir la DATABASE_URL de production
export DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE]@db.xxx.supabase.co:5432/postgres"

# Voir l'état actuel
alembic current

# Voir toutes les migrations disponibles
alembic heads
```

### Étape 2 : Appliquer toutes les migrations en attente

```bash
# Appliquer toutes les migrations manquantes
alembic upgrade head

# Vérifier que tout est à jour
alembic current
```

### Migrations récentes à vérifier (par ordre chronologique) :

1. ✅ **merge_client_fields_and_task_removals.py** - Fusion des champs clients et suppression de tâches
2. ✅ **fix_quotes_number_unique_constraint.py** - Correction contrainte unique sur numéros de devis
3. ✅ **aeb521bd56a7_fix_invoices_number_unique_constraint.py** - Correction contrainte unique sur numéros de factures
4. ✅ **add_onboarding_fields_to_company.py** - Champs onboarding pour entreprises
5. ✅ **add_city_postal_code_country_siret_to_clients.py** - Ajout champs géographiques clients
6. ✅ **8d8d12c59a28_merge_quotes_constraint_and_client_task_.py** - Fusion diverses contraintes
7. ✅ **69f2b8b467ed_remove_due_time_from_tasks.py** - Suppression due_time des tâches
8. ✅ **69e5192fb36d_remove_is_mandatory_from_tasks.py** - Suppression is_mandatory des tâches

### ⚠️ Important : Vérifications spécifiques

#### Pour les rendez-vous (appointments) avec breaks :
Les modifications récentes utilisent un nouveau format pour les breaks dans `company_settings.settings["appointments"]` :
- Ancien format : `break_count`, `break_duration`
- Nouveau format : `breaks: [{start_time, end_time}, ...]`

**Aucune migration DB nécessaire** car c'est stocké dans JSON `company_settings.settings`.

**Mais vérifier que les colonnes suivantes existent :**
```sql
-- Vérifier dans la table company_settings que settings peut stocker du JSON
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'company_settings' AND column_name = 'settings';
```

---

## 🔍 Vérifications post-déploiement

### 1. Vérifier les variables d'environnement

**Dans Railway (Production)** :
- Aller dans Variables
- Vérifier que toutes les variables sont présentes
- Vérifier que `ENVIRONMENT=production`
- Vérifier que `DATABASE_URL` pointe vers la DB de production

### 2. Vérifier les migrations appliquées

```bash
# Se connecter à la DB de production
psql "postgresql://postgres:[MOT_DE_PASSE]@db.xxx.supabase.co:5432/postgres"

# Vérifier les migrations appliquées
SELECT * FROM alembic_version ORDER BY version_num DESC;

# Vérifier que les nouvelles colonnes/tables existent
\dt  -- Liste des tables
\d clients  -- Structure de la table clients
\d tasks  -- Structure de la table tasks
\d company_settings  -- Structure de la table company_settings
```

### 3. Tester les fonctionnalités

- ✅ Envoi de SMS via Vonage (avec compte centralisé)
- ✅ Chiffrement des données sensibles (si ENCRYPTION_MASTER_KEY configuré)
- ✅ Configuration des rendez-vous avec breaks (nouveau format)
- ✅ Génération de devis/factures (contraintes uniques)
- ✅ Toutes les fonctionnalités existantes

---

## 🚨 En cas de problème

### Rollback des migrations

```bash
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

export DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE]@db.xxx.supabase.co:5432/postgres"

# Revenir à la migration précédente
alembic downgrade -1

# OU revenir à une version spécifique
alembic downgrade [revision_id]
```

**⚠️ Attention** : Le rollback peut supprimer des données. Faire une sauvegarde avant.

### Vérifier les logs

**Railway** :
- Dashboard → Service Production → Logs
- Chercher les erreurs en rouge

**Base de données** :
- Supabase Dashboard → Logs
- Vérifier les erreurs SQL

---

## 📝 Checklist finale

Avant de considérer le déploiement terminé :

### Variables d'environnement
- [ ] `VONAGE_API_KEY` ajouté
- [ ] `VONAGE_API_SECRET` ajouté
- [ ] `ENCRYPTION_MASTER_KEY` ajouté (si nécessaire)
- [ ] `ENVIRONMENT=production` vérifié
- [ ] `DATABASE_URL` pointe vers production
- [ ] `JWT_SECRET_KEY` différent de staging
- [ ] `FRONTEND_URL` correct (production)
- [ ] Toutes les autres variables vérifiées

### Migrations
- [ ] État actuel vérifié (`alembic current`)
- [ ] Toutes les migrations appliquées (`alembic upgrade head`)
- [ ] Aucune erreur lors de l'application
- [ ] Tables/colonnes vérifiées dans la DB

### Tests
- [ ] Backend accessible et fonctionnel
- [ ] Frontend accessible et fonctionnel
- [ ] SMS Vonage fonctionne
- [ ] Rendez-vous avec breaks fonctionne
- [ ] Pas d'erreurs dans les logs

---

## 🔗 Liens utiles

- **Railway Production** : https://railway.app
- **Vercel Production** : https://vercel.com
- **Supabase Production** : https://supabase.com
- **Guide complet** : `GUIDE_DEPLOIEMENT_STAGING_VERS_PROD.md`

