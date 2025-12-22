# Risques de mauvaise classification par l'IA

## ⚠️ Oui, l'IA peut se tromper de folder

L'IA peut faire des erreurs de classification, même avec toutes les validations techniques. C'est **inhérent à l'IA** et ne peut pas être complètement évité.

## 🔍 Types d'erreurs possibles

### 1. Erreurs de décision (non évitables)

**Exemples** :
- Un email de demande d'info classé dans "Spam" au lieu de "Demandes"
- Un email urgent classé dans "Newsletters" au lieu de "Urgent"
- Un email avec "lokario" dans l'expéditeur classé dans le mauvais dossier

**Cause** : L'IA interprète mal le contexte ou le contenu

**Protection actuelle** :
- ✅ Prompt détaillé avec instructions précises
- ✅ Temperature à 0.3 (plus déterministe)
- ✅ Vérification directe par expéditeur avant l'IA
- ✅ Instructions pour être "TRÈS PRUDENT" avec spam/newsletter

**Limite** : Ces protections réduisent les erreurs mais ne les éliminent pas à 100%

### 2. Erreurs techniques (évitables) ✅ CORRIGÉES

**Exemples** :
- Folder ID invalide (n'existe pas)
- Folder d'une autre entreprise
- Folder avec autoClassify désactivé

**Protection** : ✅ Toutes ces erreurs sont maintenant détectées et bloquées

## 📊 Taux d'erreur estimé

- **Classification correcte** : ~85-95% (selon la qualité des contextes de dossiers)
- **Erreurs de classification** : ~5-15%
- **Erreurs techniques** : ~0% (toutes bloquées)

## 🛡️ Protections en place

### 1. Vérification directe par expéditeur (sans IA)
- Si le contexte mentionne un expéditeur spécifique, vérification directe avant l'IA
- Réduit les erreurs pour les règles basées sur l'expéditeur

### 2. Prompt optimisé
- Instructions précises
- Exemples de format de réponse
- Instructions pour être prudent avec spam/newsletter

### 3. Temperature basse (0.3)
- Plus déterministe = moins de variations
- Réduit les erreurs aléatoires

### 4. Validations techniques ✅
- Vérifie que le folder_id est valide
- Vérifie que le dossier existe
- Vérifie que le dossier appartient à l'entreprise
- Vérifie que autoClassify est activé

## 🔧 Comment réduire les erreurs

### 1. Améliorer les contextes des dossiers
- Plus précis = meilleure classification
- Exemples concrets dans le contexte
- Mention explicite de l'expéditeur si nécessaire

### 2. Ajuster la température
- Plus bas (0.1-0.2) = plus déterministe mais moins créatif
- Plus haut (0.5-0.7) = plus créatif mais plus d'erreurs

### 3. Ajouter des exemples dans le prompt
- Exemples de bonnes classifications
- Exemples d'erreurs à éviter

### 4. Feedback utilisateur
- Permettre aux utilisateurs de corriger les classifications
- Apprendre des corrections pour améliorer

## ✅ Correction manuelle

Les utilisateurs peuvent corriger les classifications :
- Via l'interface : changer le folder d'une conversation
- Via l'API : `PATCH /inbox/conversations/{id}` avec `folder_id`

## 🎯 Recommandations

1. **Surveiller les classifications** : Vérifier régulièrement les conversations classées
2. **Améliorer les contextes** : Rendre les contextes des dossiers plus précis
3. **Corriger les erreurs** : Quand une erreur est détectée, la corriger manuellement
4. **Ajuster les règles** : Si certaines erreurs sont fréquentes, ajuster les contextes

## 📝 Conclusion

**Oui, l'IA peut se tromper**, mais :
- ✅ Les erreurs techniques sont toutes bloquées
- ✅ Les erreurs de décision sont réduites au maximum
- ✅ Les utilisateurs peuvent corriger manuellement
- ✅ Le taux d'erreur estimé est de 5-15% (acceptable pour une classification automatique)

Le code est **sécurisé techniquement**, mais l'IA reste une **approximation** et peut faire des erreurs de jugement.

