# 💰 Coûts et Expéditeur Vonage - Clarifications

## 📱 Question 1 : Est-ce que tout sera envoyé de MON numéro ?

### ❌ **NON !** Les SMS seront envoyés avec le **NOM DE L'ENTREPRISE** comme expéditeur

**Il y a deux façons d'envoyer des SMS avec Vonage :**

#### 1. Avec un numéro de téléphone (ce que vous avez actuellement)
```
Expéditeur : +33770024283
Message : "Bonjour, relance facture..."
```
→ Le client voit votre numéro personnel ❌

#### 2. Avec un nom alphanumérique (Alphanumeric Sender ID) ✅ **NOUVEAU**
```
Expéditeur : "MASUPERENT"  (nom de l'entreprise normalisé)
Message : "Bonjour, relance facture..."
```
→ Le client voit le **NOM DE L'ENTREPRISE** ✅

### 🎯 Comment ça fonctionne ?

Avec la solution centralisée :
- **Votre compte Vonage** envoie le SMS (credentials centralisés)
- **L'expéditeur affiché** = nom de l'entreprise (ex: "MASUPERENT")
- **Le client voit** : "MASUPERENT" (pas votre numéro !)

**Exemple concret :**
- Entreprise "Ma Super Entreprise" envoie un SMS
- Le client reçoit un SMS de : **"MASUPERENT"**
- Pas de votre numéro +33770024283 ✅

---

## 💰 Question 2 : Combien ça coûte ?

### Tarifs Vonage SMS

Les tarifs varient selon le **pays de destination** :

| Pays | Coût par SMS (EUR) |
|------|-------------------|
| **France** | ~0.05€ - 0.07€ |
| **États-Unis** | ~0.007€ - 0.01€ |
| **Europe (hors France)** | ~0.02€ - 0.05€ |
| **International** | Varie selon pays |

**Source :** [Vonage Pricing](https://www.vonage.fr/communications-apis/pricing/)

### 💡 Estimation des coûts mensuels

#### Scénario 1 : Petite utilisation
- 100 SMS/mois pour 10 entreprises = **1 000 SMS/mois**
- Coût : 1 000 × 0.05€ = **50€/mois**

#### Scénario 2 : Utilisation moyenne
- 500 SMS/mois pour 50 entreprises = **25 000 SMS/mois**
- Coût : 25 000 × 0.05€ = **1 250€/mois**

#### Scénario 3 : Grande utilisation
- 1 000 SMS/mois pour 100 entreprises = **100 000 SMS/mois**
- Coût : 100 000 × 0.05€ = **5 000€/mois**

### 📊 Réduction des coûts avec volume

Vonage propose des **tarifs dégressifs** :
- Plus vous envoyez de SMS, moins c'est cher par SMS
- Vous pouvez négocier des tarifs préférentiels pour gros volumes

---

## 🎯 Réponses Directes

### ❓ Est-ce que tout sera envoyé de mon numéro ?
**NON** ✅
- Les SMS seront envoyés avec le **NOM DE L'ENTREPRISE** comme expéditeur
- Le client voit "MASUPERENT" (ou le nom normalisé de l'entreprise)
- Pas votre numéro personnel

### ❓ Combien ça coûte ?
**Environ 0.05€ - 0.07€ par SMS en France**
- Coût supporté par votre compte Vonage centralisé
- Variable selon le volume et les négociations

---

## 💡 Options de Facturation (Futur)

### Option 1 : SMS inclus dans l'abonnement
- Coûts supportés par la plateforme
- Pas de facturation supplémentaire aux clients
- **Recommandé pour débuter**

### Option 2 : Facturation au SMS (à implémenter plus tard)
- Ajouter un compteur de SMS par entreprise
- Facturer X€ par SMS (ex: 0.10€/SMS = marge de 0.05€)
- Intégrer dans Stripe pour facturation automatique

**Pour l'instant** : Option 1 (SMS inclus dans l'abonnement)

---

## 🔍 Limitations Importantes

### 1. Nom d'entreprise (Alphanumeric Sender ID)
- **Maximum 11 caractères**
- **Alphanumérique uniquement** (pas d'espaces, accents, caractères spéciaux)
- **Pas disponible partout** : Certains pays (USA, Canada) n'acceptent pas les Alphanumeric Sender ID
  - Dans ces cas, Vonage utilisera un numéro court automatique

### 2. Coûts à surveiller
- **Surveiller votre consommation** sur le dashboard Vonage
- **Définir des alertes** de limite de crédit
- **Monitorer les logs** pour éviter les abus

### 3. Réglementation
- **Respecter les règles anti-spam** (consentement, opt-out)
- **Vérifier les réglementations locales** pour l'Alphanumeric Sender ID
- **GDPR** : S'assurer que les clients ont consenti à recevoir des SMS

---

## ✅ Résumé

| Aspect | Réponse |
|--------|---------|
| **Expéditeur visible** | ✅ Nom de l'entreprise (pas votre numéro) |
| **Coût par SMS (France)** | ~0.05€ - 0.07€ |
| **Qui paie ?** | Vous (compte Vonage centralisé) |
| **Facturation clients** | Pour l'instant : inclus dans l'abonnement |
| **Limite expéditeur** | 11 caractères alphanumériques |

---

## 🚀 Prochaines Étapes

1. **Créer/vérifier votre compte Vonage**
   - Ajouter un crédit initial (ex: 100€)
   - Activer les alertes de limite

2. **Tester avec un SMS**
   - Envoyer un SMS test avec nom d'entreprise
   - Vérifier que l'expéditeur est bien le nom (pas votre numéro)

3. **Monitorer les coûts**
   - Suivre la consommation sur le dashboard Vonage
   - Ajuster selon vos besoins

---

## 📞 Ressources

- **Dashboard Vonage** : https://dashboard.nexmo.com/
- **Tarifs** : https://www.vonage.fr/communications-apis/pricing/
- **Documentation Alphanumeric Sender ID** : https://developer.vonage.com/en/messaging/sms/guides/custom-sender-id
- **Support Vonage** : https://support.vonage.com/

