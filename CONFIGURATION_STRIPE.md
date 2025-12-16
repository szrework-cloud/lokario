# 🔧 Configuration Stripe - Guide Rapide

## ✅ Ce que vous avez déjà

- ✅ Clé publique Stripe : `pk_test_51SejyHJeMjOPepdF...`
- ✅ Clé secrète Stripe : `sk_test_51SejyHJeMjOPepdF...`
- ✅ Produit Starter : `prod_TbxwI6nCqzacYk`

## ❌ Ce qui manque

### 1. Les Price IDs (pas les Product IDs)

Vous avez donné un **Product ID** (`prod_...`), mais Stripe a besoin de **Price IDs** (`price_...`).

**Comment obtenir les Price IDs :**

1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Cliquez sur votre produit "Starter" (`prod_TbxwI6nCqzacYk`)
3. Dans la section **Pricing**, vous verrez les prix associés
4. Copiez le **Price ID** (commence par `price_...`)

**Exemple :**
- Product ID : `prod_TbxwI6nCqzacYk` ❌ (ce que vous avez)
- Price ID : `price_1ABC123...` ✅ (ce dont vous avez besoin)

### 2. Créer les autres produits

Vous devez créer 3 produits dans Stripe :

#### Starter (déjà créé)
- Prix : 29€/mois
- Récupérer le Price ID

#### Professional
- Créer un nouveau produit "Professional"
- Prix : 79€/mois
- Récupérer le Price ID

#### Enterprise
- Créer un nouveau produit "Enterprise"
- Prix : 199€/mois
- Récupérer le Price ID

### 3. Configurer les webhooks

1. Allez dans [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Cliquez sur **Add endpoint**
3. URL : `http://localhost:8000/stripe/webhook` (pour le dev)
   - En production : `https://votre-domaine.com/stripe/webhook`
4. Sélectionnez les événements :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copiez le **Signing secret** (commence par `whsec_...`)

## 📝 Configuration finale

### Backend (.env)

Créez ou modifiez `backend/.env` :

```env
# Stripe
# Remplacez les valeurs ci-dessous par vos propres clés Stripe depuis votre tableau de bord
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE_ICI
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE_ICI
STRIPE_WEBHOOK_SECRET=whsec_... (à récupérer après configuration webhook)
STRIPE_PRICE_STARTER=price_... (Price ID du plan Starter)
STRIPE_PRICE_PROFESSIONAL=price_... (Price ID du plan Professional)
STRIPE_PRICE_ENTERPRISE=price_... (Price ID du plan Enterprise)
```

### Frontend (.env.local)

Créez ou modifiez `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SejyHJeMjOPepdFlOK5rFyuQdHJoHnaxVoFU1HQ546xLCXWXqQ1uYopFFJUUcYusQvkLSv0QCqWDJPcoDUtgqVp00HdJ9Nk4d
```

## 🚀 Étapes rapides

1. **Récupérer le Price ID du Starter**
   - Dashboard Stripe → Products → Starter → Copier le Price ID

2. **Créer Professional (79€/mois)**
   - Dashboard → Products → Add product
   - Nom : "Professional"
   - Prix : 79€, récurrent mensuel
   - Copier le Price ID

3. **Créer Enterprise (199€/mois)**
   - Dashboard → Products → Add product
   - Nom : "Enterprise"
   - Prix : 199€, récurrent mensuel
   - Copier le Price ID

4. **Configurer les webhooks**
   - Dashboard → Webhooks → Add endpoint
   - URL : `http://localhost:8000/stripe/webhook`
   - Sélectionner les événements
   - Copier le Signing secret

5. **Ajouter toutes les variables dans `.env`**

## 🧪 Tester en local

Pour tester les webhooks en local, utilisez Stripe CLI :

```bash
# Installer Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: voir https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Forwarder les webhooks vers votre serveur local
stripe listen --forward-to localhost:8000/stripe/webhook
```

Cela vous donnera un webhook secret pour le développement local.

## ✅ Checklist finale

- [ ] Price ID Starter récupéré
- [ ] Produit Professional créé + Price ID récupéré
- [ ] Produit Enterprise créé + Price ID récupéré
- [ ] Webhook configuré + Secret récupéré
- [ ] Variables d'environnement backend configurées
- [ ] Variable d'environnement frontend configurée
- [ ] Migration de base de données exécutée

Une fois tout configuré, l'intégration Stripe sera opérationnelle ! 🎉

