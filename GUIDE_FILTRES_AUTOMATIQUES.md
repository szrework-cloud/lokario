# 🎯 Guide des Filtres Automatiques

## Vue d'ensemble

Le système de classification par filtres automatiques remplace la classification par IA (ChatGPT). Les filtres sont **plus rapides**, **plus fiables**, **gratuits** et **faciles à configurer**.

## Comment ça fonctionne

Au lieu d'utiliser l'IA pour analyser le contenu des messages, vous définissez des **règles de filtrage** pour chaque dossier. Les messages sont automatiquement classés dans les dossiers selon ces règles.

## Structure des règles de filtres

Dans `ai_rules` d'un dossier, configurez les filtres comme suit :

```json
{
  "autoClassify": true,
  "priority": 1,
  "filters": {
    "keywords": ["rdv", "rendez-vous", "appointment"],
    "keywords_location": "any",
    "sender_email": ["contact@example.com"],
    "sender_domain": ["example.com", "client.com"],
    "sender_phone": ["+33612345678"],
    "match_type": "any"
  }
}
```

### Champs disponibles

#### `autoClassify` (bool, requis)
Active ou désactive la classification automatique pour ce dossier.

#### `priority` (int, optionnel)
Priorité du dossier (plus petit = plus prioritaire). Si un message correspond à plusieurs dossiers, il sera classé dans celui avec la plus haute priorité (valeur la plus petite).

#### `filters` (object, requis si `autoClassify` est true)

##### `keywords` (array de strings)
Liste de mots-clés à chercher dans le message.

**Exemple :**
```json
"keywords": ["rdv", "rendez-vous", "appointment", "meeting"]
```

##### `keywords_location` (string)
Où chercher les mots-clés :
- `"subject"` : Seulement dans le sujet
- `"content"` : Seulement dans le contenu
- `"any"` : Dans le sujet ou le contenu (par défaut)

##### `sender_email` (array de strings)
Liste d'emails expéditeurs spécifiques.

**Exemple :**
```json
"sender_email": ["contact@client.com", "support@vendor.com"]
```

##### `sender_domain` (array de strings)
Liste de domaines d'expéditeurs.

**Exemple :**
```json
"sender_domain": ["amazon.com", "ebay.com"]
```

##### `sender_phone` (array de strings)
Liste de numéros de téléphone expéditeurs.

**Exemple :**
```json
"sender_phone": ["+33612345678", "+33612345679"]
```

##### `match_type` (string)
Comment combiner les conditions :
- `"any"` : Au moins une condition doit correspondre (OU)
- `"all"` : Toutes les conditions doivent correspondre (ET)

**Par défaut :** `"any"`

## Exemples de configurations

### Dossier "Rendez-vous"

```json
{
  "autoClassify": true,
  "priority": 1,
  "filters": {
    "keywords": ["rdv", "rendez-vous", "appointment", "meeting", "réunion"],
    "keywords_location": "any",
    "match_type": "any"
  }
}
```

### Dossier "Amazon"

```json
{
  "autoClassify": true,
  "priority": 2,
  "filters": {
    "sender_domain": ["amazon.com", "amazon.fr"],
    "match_type": "any"
  }
}
```

### Dossier "Support Client"

```json
{
  "autoClassify": true,
  "priority": 3,
  "filters": {
    "sender_email": ["support@client.com"],
    "keywords": ["support", "aide", "problème", "bug"],
    "match_type": "any"
  }
}
```

### Dossier "Factures"

```json
{
  "autoClassify": true,
  "priority": 4,
  "filters": {
    "keywords": ["facture", "invoice", "facturation", "paiement"],
    "keywords_location": "subject",
    "match_type": "any"
  }
}
```

## Avantages des filtres

✅ **Rapidité** : Classification instantanée (pas d'appel API)  
✅ **Fiabilité** : Résultats prévisibles et reproductibles  
✅ **Gratuit** : Aucun coût par message  
✅ **Facilité** : Règles claires et simples à comprendre  
✅ **Contrôle** : Vous contrôlez exactement comment les messages sont classés

## Quand utiliser les filtres vs l'IA

### Utilisez les filtres si :
- Vous connaissez les critères de classification (mots-clés, expéditeurs)
- Vous voulez une classification rapide et fiable
- Vous avez besoin de contrôler précisément la logique

### Utilisez l'IA si :
- Les critères sont complexes et difficiles à définir avec des règles
- Vous avez besoin de comprendre le contexte ou l'intention

**Note :** Pour l'instant, le système utilise uniquement les filtres. L'IA a été désactivée.

## Configuration depuis l'interface

1. Allez dans **Inbox** → **Dossiers**
2. Créez ou modifiez un dossier
3. Activez "Classification automatique"
4. Configurez vos filtres :
   - Mots-clés à chercher
   - Expéditeurs spécifiques
   - Domaines
   - Conditions (ET/OU)

## Logique de priorité

Si un message correspond à plusieurs dossiers :
1. Les dossiers sont triés par priorité (croissante)
2. Le premier dossier correspondant est sélectionné
3. Le message est classé dans ce dossier

**Conseil :** Mettez une priorité basse (1, 2, 3) pour les dossiers spécifiques, et une priorité élevée (10+) pour les dossiers génériques comme "Divers".

