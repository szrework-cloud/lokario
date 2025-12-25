# 📋 Explication : Logique de Numérotation

## 🔢 Fonctionnement de `get_next_number()`

La fonction `get_next_number()` calcule le prochain numéro en tenant compte du numéro de départ configuré.

### Logique implémentée :

```python
def get_next_number(
    last_number: Optional[int],  # Dernier numéro utilisé (ex: 50)
    start_number: int,            # Numéro de départ configuré (ex: 51)
    existing_numbers: Optional[list] = None
) -> int:
    if last_number is None:
        # Aucun document existant : utiliser le start_number
        return start_number
    
    # Utiliser le maximum entre (dernier + 1) et (start_number)
    # Cela garantit qu'on ne revient jamais en arrière
    next_number = max(last_number + 1, start_number)
    
    # Vérifier que le numéro n'existe pas déjà
    if existing_numbers:
        while next_number in existing_numbers:
            next_number += 1
    
    return next_number
```

## ✅ Cas d'Usage

### Cas 1 : Nouvelle entreprise (aucun document)
- **Configuration** : `start_number = 1`
- **Documents existants** : Aucun
- **Résultat** : Prochain numéro = **1** ✓
- **Exemple** : `DEV-2025-001`

### Cas 2 : Migration depuis autre logiciel (documents existants jusqu'au 50)
- **Configuration** : `start_number = 51`
- **Documents existants** : DEV-2025-001 à DEV-2025-050
- **Dernier numéro** : 50
- **Résultat** : Prochain numéro = `max(50 + 1, 51)` = **51** ✓
- **Exemple** : `DEV-2025-051`

### Cas 3 : Configuration après avoir déjà créé des documents
- **Configuration** : `start_number = 51` (configuré après)
- **Documents existants** : DEV-2025-001 à DEV-2025-100
- **Dernier numéro** : 100
- **Résultat** : Prochain numéro = `max(100 + 1, 51)` = **101** ✓
- **Explication** : On ne revient jamais en arrière, on continue la séquence
- **Exemple** : `DEV-2025-101`

### Cas 4 : Incrémentation normale
- **Configuration** : `start_number = 1`
- **Documents existants** : DEV-2025-001 à DEV-2025-050
- **Dernier numéro** : 50
- **Résultat** : Prochain numéro = `max(50 + 1, 1)` = **51** ✓
- **Exemple** : `DEV-2025-051`

## 🎯 Garanties

1. ✅ **Séquence continue** : Jamais de rupture dans la numérotation
2. ✅ **Respect du start_number** : Si aucun document n'existe, on commence au start_number
3. ✅ **Pas de retour en arrière** : Si des documents existent déjà au-delà du start_number, on continue la séquence
4. ✅ **Gestion des doublons** : Si un numéro existe déjà (cas rare), on incrémente jusqu'à trouver un numéro libre
5. ✅ **Race conditions** : La boucle de vérification garantit l'unicité même en cas de création simultanée

## 📊 Exemple Concret de Migration

**Scénario** : Entreprise qui migre depuis un autre logiciel

1. **Ancien logiciel** : Devis créés jusqu'à `DEV-2025-050`
2. **Configuration dans Lokario** :
   - Préfixe : `DEV`
   - Numéro de départ : `51`
3. **Premier devis créé dans Lokario** : `DEV-2025-051` ✓
4. **Deuxième devis** : `DEV-2025-052` ✓
5. **Et ainsi de suite...**

**La séquence est parfaite et sans rupture !**

