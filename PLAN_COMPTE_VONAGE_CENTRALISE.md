# 📋 Plan d'Action : Compte Vonage Centralisé avec Nom d'Entreprise Personnalisé

## 🎯 Objectif

Utiliser **un seul compte Vonage centralisé** (le vôtre) pour toutes les entreprises, tout en permettant à chaque entreprise d'envoyer des SMS avec **son propre nom d'entreprise** comme expéditeur (Alphanumeric Sender ID).

---

## 📊 Analyse de l'Existant

### Architecture Actuelle
- Chaque entreprise configure ses propres credentials Vonage dans `InboxIntegration`
- Chaque entreprise doit avoir son propre compte Vonage (coûts supplémentaires)
- Les credentials sont stockés par entreprise dans la base de données

### Architecture Cible
- **Un seul compte Vonage centralisé** (credentials dans les variables d'environnement)
- Le **nom d'entreprise** est utilisé comme expéditeur SMS (Alphanumeric Sender ID, max 11 caractères)
- Plus besoin pour les entreprises de configurer Vonage

---

## 🔧 Solution Technique

### 1. Variables d'Environnement Centralisées

Ajouter dans `backend/app/core/config.py` :
```python
# Configuration Vonage (compte centralisé)
VONAGE_API_KEY: Optional[str] = None  # API Key du compte centralisé
VONAGE_API_SECRET: Optional[str] = None  # API Secret du compte centralisé
```

**Variables à ajouter dans Railway :**
```env
VONAGE_API_KEY=votre_api_key_centralisee
VONAGE_API_SECRET=votre_api_secret_centralise
```

### 2. Modifier la Logique d'Envoi SMS

#### A. Dans `backend/app/api/routes/followups.py`

**Avant (lignes 1405-1441)** :
- Récupère les credentials depuis `InboxIntegration` de l'entreprise
- Utilise `vonage_integration.phone_number` comme expéditeur

**Après** :
- Récupère les credentials depuis les variables d'environnement (`settings.VONAGE_API_KEY`, `settings.VONAGE_API_SECRET`)
- Utilise le **nom d'entreprise** (normalisé, max 11 caractères) comme expéditeur
- Plus besoin de chercher `InboxIntegration` pour les credentials

#### B. Dans `backend/scripts/send_automatic_followups.py`

Même logique : utiliser les credentials centralisés + nom d'entreprise comme expéditeur.

### 3. Normalisation du Nom d'Entreprise

Le nom d'entreprise doit être :
- **Maximum 11 caractères** (limite Vonage Alphanumeric Sender ID)
- **Alphanumérique uniquement** (pas d'espaces, pas de caractères spéciaux)
- **En majuscules** (meilleure compatibilité)

**Exemples :**
- "Ma Super Entreprise" → "MASUPERENT"
- "ACME Corp" → "ACMECORP"
- "ABC Développement" → "ABCDEVEL"

**Fonction de normalisation :**
```python
def normalize_company_name_for_sms(company_name: str) -> str:
    """
    Normalise le nom d'entreprise pour l'utiliser comme expéditeur SMS.
    - Max 11 caractères
    - Alphanumérique uniquement (A-Z, 0-9)
    - En majuscules
    """
    # Enlever les accents, espaces, caractères spéciaux
    import unicodedata
    normalized = unicodedata.normalize('NFD', company_name)
    ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
    
    # Garder uniquement alphanumérique
    alphanumeric = ''.join(c.upper() for c in ascii_text if c.isalnum())
    
    # Limiter à 11 caractères
    return alphanumeric[:11] if alphanumeric else "LOKARIO"
```

### 4. Fallback et Compatibilité

**Ordre de priorité pour l'expéditeur SMS :**
1. Nom d'entreprise normalisé (compte centralisé) ✅ **NOUVEAU**
2. `InboxIntegration.phone_number` (compatibilité avec les anciennes intégrations)
3. "LOKARIO" (fallback par défaut)

**Ordre de priorité pour les credentials :**
1. Variables d'environnement (`VONAGE_API_KEY`, `VONAGE_API_SECRET`) ✅ **NOUVEAU**
2. `InboxIntegration.api_key`, `InboxIntegration.webhook_secret` (compatibilité)

---

## 📝 Plan d'Implémentation

### Phase 1 : Préparation (30 min)

1. ✅ **Créer un compte Vonage centralisé** (si pas déjà fait)
   - S'inscrire sur https://www.vonage.com/
   - Récupérer API Key et API Secret
   - Ajouter un crédit initial (Vonage utilise un système de crédits)

2. ✅ **Ajouter les variables d'environnement dans Railway**
   ```env
   VONAGE_API_KEY=votre_api_key
   VONAGE_API_SECRET=votre_api_secret
   ```

### Phase 2 : Modifications Backend (2-3h)

#### Étape 2.1 : Configuration (15 min)

**Fichier : `backend/app/core/config.py`**
- Ajouter `VONAGE_API_KEY` et `VONAGE_API_SECRET` dans la classe `Settings`

#### Étape 2.2 : Service de Normalisation (30 min)

**Fichier : `backend/app/core/vonage_service.py`**
- Ajouter la fonction `normalize_company_name_for_sms(company_name: str) -> str`
- Tester avec plusieurs exemples de noms d'entreprise

#### Étape 2.3 : Modifier les Endpoints API (1h)

**Fichier : `backend/app/api/routes/followups.py`**
- Ligne ~1320-1340 : Modifier la recherche d'intégration (ne plus chercher pour les credentials)
- Ligne ~1405-1441 : Modifier l'envoi SMS pour utiliser :
  - Credentials depuis `settings.VONAGE_API_KEY` et `settings.VONAGE_API_SECRET`
  - Expéditeur = nom d'entreprise normalisé

**Fichier : `backend/app/api/routes/inbox.py`**
- Même logique pour les envois SMS depuis l'inbox

#### Étape 2.4 : Modifier le Script Automatique (45 min)

**Fichier : `backend/scripts/send_automatic_followups.py`**
- Ligne ~576-624 : Même modifications que pour les endpoints API
- Utiliser credentials centralisés + nom d'entreprise normalisé

### Phase 3 : Tests (1h)

1. ✅ **Test local**
   - Tester avec une entreprise ayant un nom simple
   - Tester avec un nom avec accents/espaces
   - Vérifier que le SMS arrive avec le bon expéditeur

2. ✅ **Test en staging**
   - Déployer en staging
   - Tester l'envoi d'un SMS de relance
   - Vérifier les logs
   - Vérifier que le SMS arrive bien avec le nom d'entreprise

3. ✅ **Test de compatibilité**
   - Vérifier qu'une entreprise avec une ancienne intégration Vonage fonctionne toujours (fallback)

### Phase 4 : Déploiement Production (30 min)

1. ✅ **Ajouter les variables d'environnement dans Railway (production)**
2. ✅ **Déployer les modifications**
3. ✅ **Monitorer les logs pendant 24h**
4. ✅ **Vérifier que les SMS sont bien envoyés avec le nom d'entreprise**

### Phase 5 : Documentation (30 min)

1. ✅ **Mettre à jour le guide Vonage** (`GUIDE_MISE_EN_PLACE_VONAGE.md`)
   - Expliquer qu'un compte centralisé est utilisé
   - Expliquer que le nom d'entreprise est automatiquement utilisé
   - Supprimer les instructions pour créer un compte Vonage par entreprise

2. ✅ **Créer un document d'architecture** (`ARCHITECTURE_SMS_VONAGE.md`)
   - Expliquer le système centralisé
   - Expliquer la normalisation du nom d'entreprise
   - Documenter les limites (11 caractères)

---

## ⚠️ Limitations et Considérations

### 1. Limite Alphanumeric Sender ID

- **Maximum 11 caractères** : Les noms d'entreprise longs seront tronqués
- **Alphanumérique uniquement** : Pas d'espaces, pas d'accents
- **Pas disponible partout** : Certains pays (ex: USA, Canada) n'acceptent pas les Alphanumeric Sender ID pour les SMS. Dans ces cas, Vonage utilisera un numéro court.

### 2. Coûts

- **Vous supportez tous les coûts SMS** : Tous les SMS partent de votre compte Vonage
- **Facturation aux clients** : À envisager d'ajouter un coût par SMS dans votre système de facturation (optionnel, pour plus tard)

### 3. Réception SMS (Webhooks)

- **Un seul webhook centralisé** : Tous les SMS entrants arrivent sur le même webhook
- **Routage par numéro** : Si vous avez plusieurs numéros Vonage, vous pouvez router par numéro
- **Routage par expéditeur** : Impossible de router par nom d'entreprise (le nom n'apparaît que dans les SMS sortants)

### 4. Sécurité

- **Credentials centralisés** : Stockés dans les variables d'environnement (sécurisé)
- **Pas de credentials par entreprise** : Plus de risque de fuite de credentials d'entreprise
- **Chiffrement** : Les variables d'environnement sont chiffrées par Railway

---

## 🎯 Bénéfices

1. ✅ **Expérience utilisateur simplifiée** : Plus besoin de créer un compte Vonage
2. ✅ **Coûts réduits pour les clients** : Pas de compte Vonage à payer
3. ✅ **Contrôle centralisé** : Vous gérez un seul compte
4. ✅ **Nom d'entreprise personnalisé** : Chaque SMS arrive avec le nom de l'entreprise
5. ✅ **Maintenance simplifiée** : Un seul compte à gérer

---

## 📊 Checklist de Mise en Place

### Préparation
- [ ] Créer/vérifier le compte Vonage centralisé
- [ ] Récupérer API Key et API Secret
- [ ] Ajouter un crédit sur le compte Vonage

### Développement
- [ ] Ajouter `VONAGE_API_KEY` et `VONAGE_API_SECRET` dans `config.py`
- [ ] Créer la fonction `normalize_company_name_for_sms()`
- [ ] Modifier `followups.py` pour utiliser credentials centralisés
- [ ] Modifier `inbox.py` pour utiliser credentials centralisés
- [ ] Modifier `send_automatic_followups.py` pour utiliser credentials centralisés
- [ ] Tester localement

### Déploiement
- [ ] Ajouter les variables d'environnement dans Railway (staging)
- [ ] Tester en staging
- [ ] Ajouter les variables d'environnement dans Railway (production)
- [ ] Déployer en production
- [ ] Monitorer les logs

### Documentation
- [ ] Mettre à jour `GUIDE_MISE_EN_PLACE_VONAGE.md`
- [ ] Créer `ARCHITECTURE_SMS_VONAGE.md`
- [ ] Documenter les limites et considérations

---

## 🔄 Migration des Entreprises Existantes

### Entreprises avec intégration Vonage existante

**Option 1 : Migration automatique (recommandé)**
- Le système utilise automatiquement le compte centralisé si disponible
- Les anciennes intégrations sont ignorées (mais conservées pour compatibilité)

**Option 2 : Migration manuelle**
- Notifier les entreprises qu'elles n'ont plus besoin de configurer Vonage
- Supprimer progressivement les intégrations Vonage existantes (optionnel)

**Recommandation** : Option 1 (migration automatique) - plus transparente pour les utilisateurs.

---

## 💰 Coûts et Facturation (Futur)

### Coûts Vonage
- Vonage facture par SMS envoyé (varie selon le pays)
- Exemple : ~0.05€ par SMS en France
- Vous supportez ces coûts

### Facturation aux clients (Optionnel - À implémenter plus tard)

Si vous voulez facturer les SMS aux clients :
1. Ajouter un compteur de SMS envoyés par entreprise
2. Ajouter un coût par SMS dans les plans d'abonnement
3. Intégrer dans Stripe (facturation automatique)

**Pour l'instant** : Supporté par la plateforme (coûts inclus dans l'abonnement).

---

## 🚀 Prochaines Étapes

1. **Réviser ce plan** avec votre équipe
2. **Valider l'approche** (compte centralisé vs compte par entreprise)
3. **Commencer par la Phase 1** (ajout des variables d'environnement)
4. **Implémenter progressivement** (Phase 2 → Phase 3 → Phase 4)
5. **Monitorer les coûts** après déploiement

---

## 📞 Support

- **Documentation Vonage** : https://developer.vonage.com/en/sms/overview
- **Alphanumeric Sender ID** : https://developer.vonage.com/en/messaging/sms/guides/custom-sender-id
- **Limites par pays** : https://developer.vonage.com/en/messaging/sms/guides/formatting-and-splitting

