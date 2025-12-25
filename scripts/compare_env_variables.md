# 🔍 Script de Comparaison des Variables d'Environnement

## Comment utiliser ce script

Ce script vous aide à comparer les variables d'environnement entre staging et production.

### Méthode manuelle (Recommandée)

1. **Dans Railway (Staging)** :
   - Ouvrir votre service `lokario-backend-staging`
   - Aller dans **Variables**
   - Copier toutes les variables dans un fichier : `staging_vars.txt`

2. **Dans Railway (Production)** :
   - Ouvrir votre service de production
   - Aller dans **Variables**
   - Copier toutes les variables dans un fichier : `prod_vars.txt`

3. **Comparer** :
   ```bash
   # Voir les différences
   diff staging_vars.txt prod_vars.txt
   
   # Ou utiliser un outil visuel
   code --diff staging_vars.txt prod_vars.txt
   ```

### Variables à vérifier spécifiquement

**Variables qui DOIVENT être différentes** :
- `ENVIRONMENT` : `staging` vs `production`
- `DATABASE_URL` : URL DB staging vs URL DB production
- `JWT_SECRET_KEY` : ⚠️ DOIT être différent
- `FRONTEND_URL` : URL staging vs `https://lokario.fr`

**Variables qui peuvent être identiques** :
- `SENDGRID_API_KEY` (ou SMTP_*)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` (mais utiliser clés LIVE en prod)
- `SUPABASE_URL` (si même projet)
- `SUPABASE_SERVICE_ROLE_KEY` (si même projet)

**Variables qui peuvent être nouvelles** (à ajouter en prod) :
- `SUPABASE_STORAGE_BUCKET`
- `CRON_SECRET`
- `VONAGE_API_KEY` / `VONAGE_API_SECRET`
- Toute autre variable ajoutée récemment

