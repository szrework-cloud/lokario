# 📋 Plan d'Action : Configuration de la Numérotation des Devis et Factures

## 🎯 Objectif
Permettre à chaque entreprise de personnaliser :
1. Le **format** de numérotation (préfixe, séparateurs, padding)
2. Le **numéro de départ** pour chaque type de document
3. La **continuité** avec un ancien logiciel lors de la migration

---

## 📐 Architecture Proposée

### 1. Structure des Settings (Backend)

**Fichier :** `backend/app/core/defaults.py`

Ajouter dans la structure JSON `billing` :

```json
{
  "billing": {
    "numbering": {
      "quotes": {
        "prefix": "DEV",
        "separator": "-",
        "year_format": "YYYY",  // ou "YY" pour 2 chiffres
        "number_padding": 3,     // Nombre de chiffres (3 = 001, 4 = 0001)
        "start_number": 1,       // Numéro de départ
        "format_template": "{prefix}-{year}-{number:0{padding}d}"  // Template de format
      },
      "invoices": {
        "prefix": "FAC",
        "separator": "-",
        "year_format": "YYYY",
        "number_padding": 4,
        "start_number": 1,
        "format_template": "{prefix}-{year}-{number:0{padding}d}"
      },
      "credit_notes": {
        "prefix": "AVO",
        "separator": "-",
        "year_format": "YYYY",
        "number_padding": 4,
        "start_number": 1,
        "suffix": "AVOIR",  // Suffixe spécial pour les avoirs
        "format_template": "{prefix}-{year}-{number:0{padding}d}-{suffix}"
      }
    }
  }
}
```

### 2. Fonctions de Génération (Backend)

**Fichiers à modifier :**
- `backend/app/core/invoice_service.py` : `generate_invoice_number()`
- `backend/app/api/routes/quotes.py` : `generate_quote_number()`

**Logique :**
1. Charger la config depuis `CompanySettings.settings.billing.numbering`
2. Appliquer les valeurs par défaut si non configuré
3. Utiliser le `start_number` si aucun document n'existe
4. Format dynamique selon le template

**Exemple de fonction générique :**
```python
def format_document_number(
    prefix: str,
    year: int,
    number: int,
    padding: int = 3,
    year_format: str = "YYYY",
    separator: str = "-",
    suffix: str = None
) -> str:
    """
    Formate un numéro de document selon la configuration.
    
    Exemples:
    - DEV-2025-001
    - FAC-2025-0001
    - AVO-2025-0001-AVOIR
    """
    year_str = str(year) if year_format == "YYYY" else str(year)[-2:]
    number_str = f"{number:0{padding}d}"
    
    parts = [prefix, year_str, number_str]
    if suffix:
        parts.append(suffix)
    
    return separator.join(parts)
```

### 3. Interface Utilisateur (Frontend)

**Fichier :** `src/app/app/settings/page.tsx`

**Section à ajouter dans l'onglet "Billing" :**

```
┌─────────────────────────────────────────────────────────┐
│  📄 Numérotation des Devis et Factures                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  DEVIS                                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Préfixe: [DEV    ]  Séparateur: [-]             │  │
│  │ Format année: [YYYY ▼]  Padding: [3] chiffres   │  │
│  │ Numéro de départ: [1]                            │  │
│  │                                                   │  │
│  │ Aperçu: DEV-2025-001                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  FACTURES                                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Préfixe: [FAC    ]  Séparateur: [-]             │  │
│  │ Format année: [YYYY ▼]  Padding: [4] chiffres   │  │
│  │ Numéro de départ: [1]                            │  │
│  │                                                   │  │
│  │ Aperçu: FAC-2025-0001                            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  AVOIRS (Notes de crédit)                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Préfixe: [AVO    ]  Séparateur: [-]             │  │
│  │ Format année: [YYYY ▼]  Padding: [4] chiffres   │  │
│  │ Suffixe: [AVOIR  ]                               │  │
│  │ Numéro de départ: [1]                            │  │
│  │                                                   │  │
│  │ Aperçu: AVO-2025-0001-AVOIR                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Sauvegarder la numérotation]                          │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités :**
- Aperçu en temps réel du format
- Validation (préfixe alphanumérique, padding entre 1-6)
- Warning si changement de format avec documents existants
- Option "Réinitialiser aux valeurs par défaut"

### 4. Logique de Migration (Cas d'usage)

**Scénario :** Une entreprise vient de migrer d'un autre logiciel et a déjà des devis jusqu'au numéro DEV-2025-050.

**Solution :**
1. Dans les paramètres, l'utilisateur définit `start_number: 51`
2. La fonction `generate_quote_number()` vérifie :
   - Si des devis existent : prend le dernier numéro + 1
   - Si aucun devis : utilise `start_number`
   - Si `start_number` est supérieur au dernier : utilise `start_number`

**Code de gestion :**
```python
def get_next_number(last_number: int, start_number: int) -> int:
    """
    Retourne le prochain numéro en tenant compte du numéro de départ.
    """
    if last_number is None:
        return start_number
    return max(last_number + 1, start_number)
```

---

## 📝 Plan d'Implémentation par Étapes

### **Phase 1 : Backend - Structure de Données** ✅
- [x] Analyser la structure actuelle
- [ ] Ajouter les valeurs par défaut dans `defaults.py`
- [ ] Créer une fonction utilitaire `format_document_number()`
- [ ] Modifier `generate_quote_number()` pour utiliser la config
- [ ] Modifier `generate_invoice_number()` pour utiliser la config

### **Phase 2 : Backend - API** ✅
- [ ] Vérifier que les settings sont bien sauvegardés via l'API existante
- [ ] Tester la génération avec différentes configs
- [ ] Gérer les cas limites (changement de format, migration)

### **Phase 3 : Frontend - Interface de Configuration** ✅
- [ ] Créer le composant de configuration dans `settings/page.tsx`
- [ ] Ajouter les champs pour chaque type de document
- [ ] Implémenter l'aperçu en temps réel
- [ ] Gérer la sauvegarde via l'API existante
- [ ] Ajouter les validations et warnings

### **Phase 4 : Frontend - Affichage** ✅
- [ ] Vérifier que les numéros s'affichent correctement dans les listes
- [ ] Vérifier dans les formulaires de création
- [ ] Vérifier dans les modals de détails

### **Phase 5 : PDFs** ✅
- [ ] Vérifier `quote_pdf_service.py` (les numéros sont déjà affichés)
- [ ] Vérifier `invoice_pdf_service.py` (les numéros sont déjà affichés)
- [ ] Tester avec différents formats

### **Phase 6 : Tests & Documentation** ✅
- [ ] Tests unitaires pour la génération de numéros
- [ ] Tests d'intégration pour la configuration
- [ ] Documentation utilisateur (guide de migration)

---

## 🔍 Cas d'Usage Détailés

### Cas 1 : Nouvelle Entreprise
- Configuration par défaut : `DEV-2025-001`, `FAC-2025-0001`
- Pas de migration nécessaire

### Cas 2 : Migration depuis Autre Logiciel
- Ancien logiciel : devis jusqu'à `DEV-2025-050`
- Configuration : `start_number: 51`
- Prochain devis : `DEV-2025-051`

### Cas 3 : Changement de Format
- Ancien format : `DEV-2025-001`
- Nouveau format : `DEVIS-2025-0001`
- ⚠️ Warning : "Le format change, les nouveaux documents auront un format différent"

### Cas 4 : Format Personnalisé
- Préfixe : `QUOTE`
- Séparateur : `/`
- Padding : 5 chiffres
- Résultat : `QUOTE/2025/00001`

---

## ⚠️ Points d'Attention

1. **Rétrocompatibilité** : Les entreprises existantes doivent avoir les valeurs par défaut
2. **Validation** : S'assurer que le format généré est unique (contrainte DB)
3. **Migration** : Gérer le cas où `start_number` est inférieur aux documents existants
4. **Performance** : La génération doit rester rapide (requête optimisée)
5. **Logs** : Logger les changements de configuration pour audit

---

## 🎨 Exemples de Formats Supportés

| Format | Préfixe | Année | Padding | Résultat |
|--------|---------|-------|---------|----------|
| Standard | DEV | YYYY | 3 | DEV-2025-001 |
| Court | D | YY | 3 | D-25-001 |
| Long | DEVIS | YYYY | 5 | DEVIS-2025-00001 |
| Sans séparateur | QUOTE | YYYY | 4 | QUOTE20250001 |
| Avec suffixe | AVO | YYYY | 4 | AVO-2025-0001-AVOIR |

---

## ✅ Checklist de Validation

- [ ] Les nouveaux documents utilisent le format configuré
- [ ] Les anciens documents conservent leur format d'origine
- [ ] Le numéro de départ fonctionne correctement
- [ ] L'interface de configuration est intuitive
- [ ] Les PDFs affichent les bons numéros
- [ ] Les listes affichent les bons numéros
- [ ] La validation empêche les formats invalides
- [ ] Les valeurs par défaut sont appliquées pour les nouvelles entreprises

---

## 📚 Références Techniques

- **Backend Settings Structure** : `backend/app/core/defaults.py`
- **Quote Number Generation** : `backend/app/api/routes/quotes.py:59`
- **Invoice Number Generation** : `backend/app/core/invoice_service.py:138`
- **Settings Storage** : `backend/app/db/models/company_settings.py`
- **Frontend Settings UI** : `src/app/app/settings/page.tsx`

