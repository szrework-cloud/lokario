# ⚡ Configuration Stripe - Version Rapide

## ✅ Ce que vous avez

- ✅ Clé publique : Remplacez par votre clé publique Stripe (commence par `pk_test_`)
- ✅ Clé secrète : Remplacez par votre clé secrète Stripe (commence par `sk_test_`)
- ✅ Price ID Starter : Remplacez par votre Price ID (commence par `price_`)

## 📝 Configuration minimale

### Backend (`backend/.env`)

Ajoutez ces lignes dans votre fichier `backend/.env` :

```env
# Stripe
# Remplacez les valeurs ci-dessous par vos propres clés Stripe depuis votre tableau de bord
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE_ICI
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE_ICI
STRIPE_PRICE_STARTER=price_VOTRE_PRICE_ID_ICI

# Pour l'instant, on n'a qu'un plan (Starter)
# Les autres plans peuvent être ajoutés plus tard
STRIPE_PRICE_PROFESSIONAL=
STRIPE_PRICE_ENTERPRISE=

# Webhook (optionnel pour l'instant - on peut tester sans)
STRIPE_WEBHOOK_SECRET=
```

### Frontend (`.env.local` à la racine)

Créez ou modifiez `.env.local` :

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SejyHJeMjOPepdFlOK5rFyuQdHJoHnaxVoFU1HQ546xLCXWXqQ1uYopFFJUUcYusQvkLSv0QCqWDJPcoDUtgqVp00HdJ9Nk4d
```

## 🧪 Tester en local (sans webhook)

Pour tester les webhooks en local, utilisez **Stripe CLI** :

```bash
# Installer Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Ou télécharger depuis https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Forwarder les webhooks vers votre serveur local
stripe listen --forward-to localhost:8000/stripe/webhook
```

Cela vous donnera un **webhook secret temporaire** que vous pouvez utiliser pour tester.

## 🚀 Ce qui fonctionne maintenant

- ✅ Checkout Stripe pour le plan Starter
- ✅ Création d'abonnements
- ✅ Portail client Stripe (gestion de l'abonnement)
- ✅ Page de pricing (`/app/pricing`)

## ⚠️ Note importante

Le code a été adapté pour fonctionner **sans webhook secret** en développement. Les webhooks seront traités mais sans vérification de signature.

**En production**, il faudra absolument :
1. Configurer un webhook dans Stripe Dashboard
2. Récupérer le webhook secret
3. L'ajouter dans `STRIPE_WEBHOOK_SECRET`

## 📋 Prochaines étapes (optionnel)

1. **Créer les autres plans** dans Stripe Dashboard
2. **Récupérer les Price IDs** pour Professional et Enterprise
3. **Les ajouter** dans le `.env`

Pour l'instant, vous pouvez tester avec le plan Starter uniquement ! 🎉

