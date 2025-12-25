# 🔄 Comment fonctionne la stratégie hybride (Règles simples → IA)

## Logique de décision

### Principe simple : Essayer dans l'ordre jusqu'à trouver

```
1. Essayer les règles simples (mots-clés, expéditeurs)
   ├─ Si SUCCÈS → Retourner le dossier trouvé ✅ (STOP)
   └─ Si ÉCHEC (retourne None) → Passer à l'étape 2

2. Essayer l'IA
   ├─ Si SUCCÈS → Retourner le dossier trouvé ✅
   └─ Si ÉCHEC → Retourner None (message non classé)
```

## Code de la logique

### Fonction hybride (pseudo-code)

```python
def classify_conversation_hybrid(conversation, message):
    # ÉTAPE 1 : Essayer les règles simples
    folder_id = classify_conversation_with_filters(
        conversation=conversation,
        message=message
    )
    
    # Si les règles simples ont trouvé un dossier → SUCCÈS, on s'arrête
    if folder_id is not None:
        return folder_id  # ✅ Classé par règles simples
    
    # Si folder_id est None → Les règles simples ont ÉCHOUÉ
    # ÉTAPE 2 : Essayer l'IA
    folder_id = ai_service.classify_message_to_folder(
        message_content=message.content,
        message_subject=message.subject,
        message_from=message.from_email,
        folders=folders
    )
    
    # L'IA retourne aussi None si elle ne trouve rien
    return folder_id  # Soit un dossier trouvé, soit None
```

## Comment les règles simples détectent un match

### Exemple 1 : SUCCÈS avec les règles simples

**Message reçu** :
```
De: newsletter@example.com
Sujet: Découvrez nos offres
Contenu: ... désabonnez-vous ...
```

**Règles du dossier "Newsletters"** :
```json
{
  "keywords": ["newsletter", "désabonnez", "unsubscribe"],
  "sender_domain": ["example.com"]
}
```

**Résultat** :
- ✅ Mot-clé "désabonnez" trouvé dans le contenu
- ✅ Domaine "example.com" correspond à l'expéditeur
- **→ Retourne folder_id = 5 (Newsletters)**
- **→ L'IA n'est PAS appelée** (économie de coût)

### Exemple 2 : ÉCHEC avec les règles simples → IA nécessaire

**Message reçu** :
```
De: contact@client-important.fr
Sujet: Demande de rendez-vous
Contenu: Bonjour, j'aimerais prendre un rendez-vous la semaine prochaine pour discuter de notre projet. 
         Seriez-vous disponible mardi après-midi ?
```

**Règles du dossier "RDV"** :
```json
{
  "keywords": ["rdv", "rendez-vous"]
}
```

**Résultat des règles simples** :
- ❌ Mot-clé exact "rdv" non trouvé (le message dit "rendez-vous" avec tiret)
- ❌ Mot-clé exact "rendez-vous" non trouvé (recherche insensible à la casse, mais peut échouer selon l'implémentation)
- **→ Retourne None**

**Passage à l'IA** :
- L'IA comprend le contexte : "prendre un rendez-vous", "disponible mardi"
- ✅ L'IA détecte que c'est une demande de RDV
- **→ Retourne folder_id = 3 (RDV)**

## Détails techniques

### Fonction `classify_conversation_with_filters`

Cette fonction retourne :
- **`int` (ID du dossier)** si un match est trouvé
- **`None`** si aucun match n'est trouvé

```python
def classify_conversation_with_filters(...):
    # Teste chaque dossier avec ses règles
    for folder in folders:
        if _test_filter_rules(...):  # Retourne True/False
            return folder.id  # ✅ Match trouvé
    
    return None  # ❌ Aucun match trouvé
```

### Fonction `_test_filter_rules`

Cette fonction teste si un message correspond aux règles :

```python
def _test_filter_rules(message_content, filter_rules):
    keywords = filter_rules.get("keywords", [])
    
    # Cherche les mots-clés dans le contenu
    for keyword in keywords:
        if keyword.lower() in message_content.lower():
            return True  # ✅ Match trouvé
    
    return False  # ❌ Aucun match
```

## Quand l'IA est nécessaire

L'IA est utilisée quand :

1. **Mots-clés absents** mais sens du message clair
   - Ex: "J'aimerais vous rencontrer" → pas de mot-clé "rdv" mais demande de RDV

2. **Variations linguistiques**
   - Ex: "meeting", "point", "échange" au lieu de "rendez-vous"
   - Ex: "newsletter", "infolettre", "lettre d'information"

3. **Contexte complexe**
   - Ex: Message qui parle de facture mais qui est en réalité une demande de devis

4. **Expéditeurs nouveaux**
   - Ex: Nouveau client qui n'est pas encore dans les règles

5. **Messages ambigus**
   - Ex: Email qui pourrait être spam ou réel selon le contexte

## Statistiques typiques

### Distribution normale (sans optimisation)

- **70%** des messages → Classés par règles simples (gratuit)
- **30%** des messages → Nécessitent l'IA (coûteux)

### Avec optimisation des règles

Si vous améliorez les règles (plus de mots-clés, plus de domaines) :
- **85%** des messages → Classés par règles simples
- **15%** des messages → Nécessitent l'IA

## Optimisation : Améliorer les règles simples

### Stratégie recommandée

1. **Analyser les messages non classés** régulièrement
2. **Identifier les patterns récurrents**
3. **Ajouter les mots-clés manquants** aux règles

### Exemple d'amélioration

**Avant** (dossier RDV) :
```json
{
  "keywords": ["rdv", "rendez-vous"]
}
```
→ Taux de succès : 60%

**Après amélioration** :
```json
{
  "keywords": [
    "rdv", "rendez-vous", "rendez vous",
    "meeting", "rencontre", "disponibilité",
    "disponible", "planifier", "planification",
    "prendre rdv", "fixer un rendez-vous"
  ]
}
```
→ Taux de succès : 85%

## Code complet (version simplifiée)

```python
def classify_conversation_hybrid(db, conversation, message, company_id, use_ai_fallback=True):
    """
    Classification hybride : règles simples d'abord, IA en fallback.
    """
    # ÉTAPE 1 : Essayer les règles simples
    folder_id = classify_conversation_with_filters(
        db=db,
        conversation=conversation,
        message=message,
        company_id=company_id
    )
    
    # Si succès → retourner immédiatement (pas besoin d'IA)
    if folder_id:
        logger.debug(f"✅ Classé par règles simples dans le dossier {folder_id}")
        return folder_id
    
    # Si échec (None) et que l'IA est activée → utiliser l'IA
    if not use_ai_fallback:
        logger.debug("❌ Règles simples échouées, mais IA désactivée")
        return None
    
    ai_service = get_ai_classifier_service()
    if not ai_service or not ai_service.enabled:
        logger.debug("❌ Règles simples échouées, mais IA non disponible")
        return None
    
    # ÉTAPE 2 : Essayer l'IA
    logger.debug("🔄 Tentative de classification par IA...")
    folder_id = ai_service.classify_message_to_folder(
        message_content=message.content[:500],  # Tronquer pour économiser
        message_subject=conversation.subject,
        message_from=message.from_email,
        folders=folders_with_ai
    )
    
    if folder_id:
        logger.info(f"✅ Classé par IA dans le dossier {folder_id}")
    else:
        logger.debug("❌ L'IA n'a pas trouvé de dossier approprié")
    
    return folder_id
```

## Résumé

| Situation | Règles simples | IA | Résultat |
|-----------|----------------|-----|----------|
| Mot-clé exact trouvé | ✅ Retourne folder_id | ❌ Pas appelée | Classé gratuitement |
| Domaine correspond | ✅ Retourne folder_id | ❌ Pas appelée | Classé gratuitement |
| Aucun match | ❌ Retourne None | ✅ Appelée | Classé par IA (coûteux) |
| IA désactivée + pas de match | ❌ Retourne None | ❌ Pas appelée | Non classé |

## Avantages de cette approche

1. **Économique** : 70-85% des messages classés gratuitement
2. **Rapide** : Les règles simples sont instantanées
3. **Précis** : L'IA gère les cas complexes
4. **Évolutif** : Plus on améliore les règles, moins on a besoin d'IA

---

**En résumé** : Le système essaie toujours les règles simples en premier. Si elles retournent `None` (aucun match), alors l'IA est appelée. C'est automatique et transparent.







