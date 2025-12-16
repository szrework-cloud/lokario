# 💳 Intégration Stripe - Guide Complet

Intégration professionnelle de Stripe pour la gestion des abonnements SaaS.

## ✅ Ce qui a été implémenté

### Backend

1. **Modèles de base de données** (`backend/app/db/models/subscription.py`)
   - `Subscription` - Gestion des abonnements
   - `SubscriptionInvoice` - Factures Stripe
   - `SubscriptionPaymentMethod` - Méthodes de paiement
   - `SubscriptionEvent` - Log des événements webhooks

2. **Routes API** (`backend/app/api/routes/stripe.py`)
   - `GET /stripe/plans` - Liste des plans disponibles
   - `GET /stripe/subscription` - Abonnement actuel
   - `POST /stripe/create-checkout-session` - Créer une session de checkout
   - `POST /stripe/create-portal-session` - Accéder au portail client
   - `POST /stripe/webhook` - Recevoir les webhooks Stripe

3. **Configuration** (`backend/app/core/config.py`)
   - Variables d'environnement Stripe ajoutées

### Frontend

1. **Services** (`src/services/stripeService.ts`)
   - Fonctions pour interagir avec l'API Stripe

2. **Hooks React Query** (`src/hooks/queries/useStripe.ts`)
   - `usePlans()` - Récupérer les plans
   - `useSubscription()` - Récupérer l'abonnement
   - `useCreateCheckoutSession()` - Créer un checkout
   - `useCreatePortalSession()` - Accéder au portail

3. **Composants UI**
   - `PricingCard` - Carte de plan avec animations
   - Page `/app/pricing` - Page de tarification complète

## 🚀 Configuration

### 1. Variables d'environnement Backend

Ajoutez dans votre `.env` backend :

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### 2. Variables d'environnement Frontend

Ajoutez dans votre `.env.local` frontend :

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Installation des dépendances

**Backend :**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend :**
```bash
npm install
```

### 4. Créer les produits et prix dans Stripe

1. Connectez-vous à votre [Dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Products** → **Add product**
3. Créez 3 produits :
   - **Starter** - 29€/mois
   - **Professional** - 79€/mois
   - **Enterprise** - 199€/mois
4. Copiez les **Price IDs** et ajoutez-les dans votre `.env`

### 5. Configurer les webhooks

1. Dans Stripe Dashboard → **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionnez les événements :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copiez le **Signing secret** et ajoutez-le dans votre `.env`

## 📋 Migration de base de données

Créez une migration Alembic pour les nouvelles tables :

```bash
cd backend
alembic revision --autogenerate -m "Add subscription tables"
alembic upgrade head
```

## 🎯 Utilisation

### Page de tarification

Accédez à `/app/pricing` pour voir les plans et souscrire.

### Gestion de l'abonnement

Dans les paramètres (`/app/settings`), ajoutez un onglet "Facturation" qui permet :
- Voir l'abonnement actuel
- Accéder au portail client Stripe
- Gérer la méthode de paiement
- Voir l'historique des factures

### Webhooks

Les webhooks Stripe sont automatiquement traités pour :
- Synchroniser le statut des abonnements
- Créer les factures en base
- Gérer les échecs de paiement

## 🔒 Sécurité

- ✅ Vérification des signatures webhook
- ✅ Validation des données côté serveur
- ✅ Tokens d'authentification requis
- ✅ Logging des événements

## 📊 Plans disponibles

### Starter - 29€/mois
- Jusqu'à 50 clients
- Factures illimitées
- Gestion des tâches
- Support email

### Professional - 79€/mois
- Clients illimités
- Factures illimitées
- Tous les modules
- Inbox automatisé
- Support prioritaire
- API access

### Enterprise - 199€/mois
- Tout Professional
- Multi-utilisateurs
- Personnalisation
- Support dédié
- Formation incluse
- SLA garanti

## 🐛 Dépannage

### Les webhooks ne fonctionnent pas
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Utilisez [Stripe CLI](https://stripe.com/docs/stripe-cli) pour tester en local :
  ```bash
  stripe listen --forward-to localhost:8000/stripe/webhook
  ```

### Erreur lors du checkout
- Vérifiez que les Price IDs sont corrects
- Assurez-vous que `STRIPE_SECRET_KEY` est valide
- Vérifiez les logs backend pour plus de détails

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

