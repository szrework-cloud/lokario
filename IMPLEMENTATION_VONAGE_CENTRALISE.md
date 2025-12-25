# ✅ Implémentation : Compte Vonage Centralisé

## 📋 Résumé

Implémentation complète d'un système de compte Vonage centralisé avec nom d'entreprise personnalisé comme expéditeur SMS, tout en conservant la compatibilité avec les intégrations existantes par entreprise.

---

## 🔧 Modifications Effectuées

### 1. Configuration (`backend/app/core/config.py`)
- ✅ Ajout de `VONAGE_API_KEY` et `VONAGE_API_SECRET` dans la classe `Settings`
- ✅ Ajout d'un message de debug au démarrage pour vérifier la configuration Vonage

### 2. Service Vonage (`backend/app/core/vonage_service.py`)
- ✅ Ajout de la fonction `normalize_company_name_for_sms(company_name: str) -> str`
  - Normalise le nom d'entreprise pour l'utiliser comme expéditeur SMS
  - Maximum 11 caractères alphanumériques (limite Vonage)
  - Supprime les accents, espaces, caractères spéciaux
  - Convertit en majuscules
- ✅ Ajout de la fonction `get_vonage_credentials_and_sender(...)`
  - Récupère les credentials Vonage avec fallback
  - Priorité 1 : Credentials centralisés (variables d'environnement) + nom d'entreprise normalisé
  - Priorité 2 : Intégration par entreprise (compatibilité rétroactive) + phone_number

### 3. Routes Followups (`backend/app/api/routes/followups.py`)
- ✅ Modification de l'envoi SMS pour utiliser `get_vonage_credentials_and_sender()`
- ✅ Utilisation du nom d'entreprise normalisé comme expéditeur
- ✅ Compatibilité rétroactive maintenue (fallback vers intégrations existantes)

### 4. Script Relances Automatiques (`backend/scripts/send_automatic_followups.py`)
- ✅ Modification de `send_followup_via_inbox()` pour utiliser `get_vonage_credentials_and_sender()`
- ✅ Récupération du nom d'entreprise depuis la base de données
- ✅ Utilisation du nom d'entreprise normalisé comme expéditeur

### 5. Routes Inbox (`backend/app/api/routes/inbox.py`)
- ✅ Modification de `create_conversation()` pour utiliser `get_vonage_credentials_and_sender()`
- ✅ Modification de `create_message()` pour utiliser `get_vonage_credentials_and_sender()`
- ✅ Récupération du nom d'entreprise depuis `current_user.company.name`

---

## 🔄 Logique de Fallback

**Ordre de priorité pour les credentials :**
1. **Compte centralisé** (variables d'environnement `VONAGE_API_KEY`, `VONAGE_API_SECRET`)
   - Expéditeur = nom d'entreprise normalisé (ex: "MASUPERENT")
2. **Intégration par entreprise** (table `inbox_integrations`)
   - Expéditeur = `phone_number` de l'intégration (ex: "+33770024283")

**Compatibilité rétroactive :**
- Les entreprises ayant déjà configuré une intégration Vonage continuent de fonctionner
- Le système détecte automatiquement quelle méthode utiliser
- Pas de migration nécessaire

---

## ⚙️ Configuration Requise

### Variables d'Environnement à Ajouter

**Dans Railway (production/staging) :**
```env
VONAGE_API_KEY=votre_api_key_centralisee
VONAGE_API_SECRET=votre_api_secret_centralise
```

**Dans `.env` (développement local) :**
```env
VONAGE_API_KEY=votre_api_key_centralisee
VONAGE_API_SECRET=votre_api_secret_centralise
```

---

## ✅ Tests à Effectuer

### 1. Test avec compte centralisé
- [ ] Ajouter les variables d'environnement `VONAGE_API_KEY` et `VONAGE_API_SECRET`
- [ ] Envoyer un SMS de relance depuis l'interface
- [ ] Vérifier que le SMS arrive avec le nom d'entreprise comme expéditeur (ex: "MASUPERENT")
- [ ] Vérifier les logs pour confirmer l'utilisation du compte centralisé

### 2. Test de compatibilité rétroactive
- [ ] Supprimer temporairement les variables d'environnement centralisées
- [ ] Vérifier qu'une entreprise avec intégration Vonage existante fonctionne toujours
- [ ] Vérifier que l'expéditeur est bien le `phone_number` de l'intégration

### 3. Test de normalisation du nom
- [ ] Tester avec différents noms d'entreprise :
  - "Ma Super Entreprise" → "MASUPERENT"
  - "ACME Corp" → "ACMECORP"
  - "ABC Développement" → "ABCDEVEL"
  - Nom très long (> 11 caractères) → tronqué à 11 caractères

---

## 📊 Bénéfices

1. ✅ **Expérience utilisateur simplifiée** : Plus besoin de créer un compte Vonage par entreprise
2. ✅ **Coûts centralisés** : Tous les SMS partent du même compte
3. ✅ **Nom d'entreprise personnalisé** : Chaque SMS arrive avec le nom de l'entreprise
4. ✅ **Compatibilité rétroactive** : Les intégrations existantes continuent de fonctionner
5. ✅ **Maintenance simplifiée** : Un seul compte à gérer

---

## 🔍 Logs de Debug

Le système log automatiquement :
- L'utilisation du compte centralisé : `"[VONAGE] Utilisation du compte centralisé avec expéditeur: MASUPERENT"`
- L'utilisation d'une intégration existante : `"[VONAGE] Utilisation de l'intégration par entreprise avec expéditeur: +33770024283"`
- Les erreurs de configuration : `"[VONAGE] Aucune configuration Vonage trouvée (centralisée ou intégration)"`

---

## ⚠️ Limitations

1. **Nom d'entreprise** : Maximum 11 caractères (limite Vonage Alphanumeric Sender ID)
2. **Caractères spéciaux** : Supprimés automatiquement (accents, espaces, etc.)
3. **Pays incompatibles** : Certains pays (USA, Canada) n'acceptent pas les Alphanumeric Sender ID
   - Dans ce cas, Vonage utilisera automatiquement un numéro court
4. **Coûts** : Tous les coûts SMS sont supportés par le compte centralisé

---

## 🚀 Prochaines Étapes

1. ✅ **Ajouter les variables d'environnement dans Railway**
2. ✅ **Tester en staging**
3. ✅ **Déployer en production**
4. ✅ **Monitorer les coûts SMS sur le dashboard Vonage**
5. ⏳ **Optionnel** : Ajouter un compteur de SMS par entreprise pour facturation future

---

## 📝 Notes Techniques

- Les credentials centralisés ne sont **pas chiffrés** (variables d'environnement)
- Les credentials d'intégration par entreprise sont **chiffrés** avec `ENCRYPTION_MASTER_KEY`
- La fonction `normalize_company_name_for_sms()` utilise `unicodedata` pour gérer les accents
- La fonction `get_vonage_credentials_and_sender()` est thread-safe et peut être appelée depuis n'importe quel endpoint

