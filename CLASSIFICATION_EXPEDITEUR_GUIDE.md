# 🔧 Guide : Classification par expéditeur

## Problème

Les messages avec "adem" dans l'expéditeur ne sont pas classés dans le dossier créé pour cet expéditeur.

## Solution

J'ai amélioré la logique de classification pour :
1. ✅ Vérifier directement l'expéditeur avant d'appeler l'IA
2. ✅ Améliorer le prompt de l'IA pour mieux comprendre les règles basées sur l'expéditeur

## Comment configurer

Dans le dossier, dans le champ **"Context"**, vous pouvez écrire :

### Option 1 : Simple
```
adem
```
→ Classera tous les messages de "adem@gmail.com", "Adem Gurler", etc.

### Option 2 : Explicite
```
expéditeur: adem
```
ou
```
from: adem
```
→ Même résultat

### Option 3 : Email complet
```
adem@gmail.com
```
→ Classera uniquement les messages de cette adresse exacte

## Comment reclasser les conversations existantes

### Option 1 : Via l'interface (recommandé)
1. Modifiez le dossier (par exemple, ajoutez un espace dans le context puis enlevez-le)
2. Cela déclenchera automatiquement une reclassification avec `force=True`

### Option 2 : Via script
```bash
cd backend
source venv/bin/activate
python scripts/reclassify_force.py
```

### Option 3 : Test spécifique
```bash
cd backend
source venv/bin/activate
python scripts/test_classification_expediteur.py
```

## Vérification

1. Créez/modifiez votre dossier avec le context "adem"
2. Activez la classification automatique
3. Reclassez les conversations
4. Vérifiez dans les logs : vous devriez voir `✅ Correspondance directe trouvée: 'adem' dans expéditeur...`

## Notes

- La vérification est **case-insensitive** (insensible à la casse)
- Elle cherche dans l'email ET dans le nom de l'expéditeur
- Les mots-clés de moins de 3 caractères sont ignorés pour éviter les faux positifs

