# Comment fonctionne la détection automatique des auto-entrepreneurs ?

## ❌ Ce n'est PAS basé sur le taux de TVA que vous saisissez

**Important** : Le système ne détecte PAS automatiquement un auto-entrepreneur en regardant si vous mettez 0% de TVA partout.

## ✅ C'est basé sur les informations de l'ENTREPRISE

La détection se fait **AVANT** la création de la facture, en vérifiant les champs de l'entreprise dans la base de données.

**Important** : L'auto-entrepreneur est l'**ENTREPRISE** qui crée les factures, pas le client.

### Fonctionnement

1. **Vous créez/modifiez une ENTREPRISE** et vous cochez :
   - `is_auto_entrepreneur = true` 
   - OU `vat_exempt = true`

2. **Plus tard, quand vous créez une FACTURE avec cette entreprise** :
   - Le système vérifie automatiquement : "Cette entreprise est-elle auto-entrepreneur ?"
   - Si OUI → **Ignore complètement** le taux de TVA que vous avez saisi
   - **Force automatiquement** toutes les lignes à 0% de TVA
   - **Ajoute automatiquement** la mention légale

## 📝 Exemple concret

### Scénario 1 : Entreprise normale (pas auto-entrepreneur)

```json
// Entreprise dans la base
{
  "id": 1,
  "name": "Entreprise ABC",
  "is_auto_entrepreneur": false,  // ← Entreprise normale
  "vat_exempt": false
}

// Vous créez une facture
POST /invoices
{
  "client_id": 1,
  "lines": [
    {
      "description": "Prestation",
      "quantity": 1,
      "unit_price_ht": 100,
      "tax_rate": 20  // ← Vous mettez 20%
    }
  ]
}

// Résultat : La facture a bien 20% de TVA ✅
```

### Scénario 2 : Entreprise auto-entrepreneur

```json
// Entreprise dans la base
{
  "id": 2,
  "name": "Jean Dupont - Auto-entrepreneur",
  "is_auto_entrepreneur": true,  // ← AUTO-ENTREPRENEUR !
  "vat_exempt": false
}

// Vous créez une facture avec cette entreprise (vous pouvez même mettre 20% par erreur)
POST /invoices
{
  "company_id": 2,  // ← L'entreprise auto-entrepreneur
  "lines": [
    {
      "description": "Prestation",
      "quantity": 1,
      "unit_price_ht": 100,
      "tax_rate": 20  // ← Vous mettez 20% par erreur
    }
  ]
}

// Résultat : Le système IGNORE votre 20% et met automatiquement 0% ✅
// La facture créée aura :
// - tax_rate: 0 (pas 20 !)
// - vat_applicable: false
// - vat_exemption_reference: "TVA non applicable, art. 293 B du CGI"
```

## 🔍 Code qui fait ça

```python
# backend/app/api/routes/invoices.py - ligne 262-266

# Si ENTREPRISE auto-entrepreneur ou exonérée, forcer le taux TVA à 0
if company.is_auto_entrepreneur or company.vat_exempt:
    tax_rate = Decimal('0')  # ← IGNORE ce que vous avez saisi !
else:
    tax_rate = Decimal(str(line_data.tax_rate))  # ← Utilise ce que vous avez saisi
```

## 🎯 Avantages

1. **Protection contre les erreurs** : Même si vous oubliez et mettez 20% de TVA, le système corrige automatiquement
2. **Conformité légale** : La mention légale est ajoutée automatiquement
3. **Pas besoin de se rappeler** : Une fois le client marqué comme auto-entrepreneur, toutes ses factures seront automatiquement sans TVA

## 📋 Workflow recommandé

1. **Marquer l'entreprise** avec `is_auto_entrepreneur: true` dans les paramètres de l'entreprise
2. **Créer des factures** normalement (vous pouvez même mettre 20% de TVA, ça sera ignoré)
3. **Le système applique automatiquement** les règles pour auto-entrepreneurs

## ⚠️ Important

- Le taux de TVA que vous saisissez dans la facture est **ignoré** si l'entreprise est auto-entrepreneur
- C'est une **protection**, pas une détection basée sur le taux
- Vous devez **d'abord** marquer l'entreprise comme auto-entrepreneur dans ses paramètres
- **C'est l'entreprise qui crée les factures qui doit être auto-entrepreneur, pas le client**
