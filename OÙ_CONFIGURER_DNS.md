# 🌐 Où configurer les DNS SendGrid ?

## ❌ Pas directement sur Vercel

Ces enregistrements DNS doivent être configurés dans le **gestionnaire DNS du domaine `lokario.fr`**, pas directement sur Vercel.

## ✅ Où les configurer ?

### Option 1 : Si Vercel gère vos DNS

**Si vous avez configuré le domaine directement dans Vercel :**

1. Vercel Dashboard → Votre projet
2. Settings → **Domains**
3. Cliquez sur `lokario.fr`
4. Onglet **"DNS Records"** ou **"Configuration DNS"**
5. Ajoutez les 4 enregistrements

### Option 2 : Si votre registrar gère les DNS (le plus courant)

**Si vous avez acheté le domaine sur OVH, Cloudflare, Google Domains, etc. :**

1. Connectez-vous à votre **registrar** (là où vous avez acheté le domaine)
2. Section **"DNS"** ou **"Zone DNS"**
3. Ajoutez les 4 enregistrements

## 🔍 Comment savoir où configurer ?

### Méthode 1 : Vérifier dans Vercel

1. Vercel Dashboard → Projet → Settings → Domains
2. Regardez la section **"Nameservers"** :
   - Si c'est Vercel (ex: `ns1.vercel-dns.com`) → Configurez sur **Vercel**
   - Si c'est autre chose (ex: OVH, Cloudflare) → Configurez sur votre **registrar**

### Méthode 2 : Vérifier avec une commande

```bash
dig NS lokario.fr
```

Regardez les nameservers dans la réponse.

## 📋 Résumé rapide

| Où vous avez acheté le domaine | Où configurer les DNS |
|-------------------------------|----------------------|
| Vercel (domaine acheté sur Vercel) | Vercel Dashboard → Domains → DNS |
| OVH | OVH Manager → Zone DNS |
| Cloudflare | Cloudflare Dashboard → DNS |
| Google Domains | Google Domains → DNS |
| Autre registrar | Section DNS de votre registrar |

## 🎯 Pour `lokario.fr`

**Question rapide :** Où avez-vous acheté/configuré le domaine `lokario.fr` ?

- Si c'est sur **OVH** → Configurez sur OVH Manager
- Si c'est sur **Cloudflare** → Configurez sur Cloudflare
- Si c'est sur **Vercel** → Configurez sur Vercel Dashboard

Une fois que vous savez où, ajoutez les 4 enregistrements DNS que SendGrid vous a donnés ! 📧
