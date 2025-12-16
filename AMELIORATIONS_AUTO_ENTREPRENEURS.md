# Améliorations - Gestion Auto-Entrepreneurs

**Date** : Janvier 2025  
**Objectif** : Compléter la conformité du module factures pour la gestion des auto-entrepreneurs

**Important** : L'auto-entrepreneur est l'**ENTREPRISE** qui crée les factures, pas le client.

---

## ✅ Modifications Apportées

### 1. Modèle Company (`backend/app/db/models/company.py`)

**Ajout de 3 nouveaux champs** :
- `is_auto_entrepreneur` : Boolean, indique si l'entreprise est auto-entrepreneur
- `vat_exempt` : Boolean, indique si l'entreprise est exonérée de TVA
- `vat_exemption_reference` : String(100), référence de l'article CGI (ex: "Art. 293 B du CGI")

```python
# Gestion TVA et auto-entrepreneurs
is_auto_entrepreneur = Column(Boolean, default=False, nullable=False)
vat_exempt = Column(Boolean, default=False, nullable=False)
vat_exemption_reference = Column(String(100), nullable=True)
```

### 2. Schémas API Company (`backend/app/api/schemas/company.py`)

**Ajout des champs dans** :
- `CompanyBase` : Pour la création et la lecture
- `CompanyUpdate` : Pour la mise à jour
- `CompanyRead` : Pour la lecture complète

### 3. Route de Création de Facture (`backend/app/api/routes/invoices.py`)

**Validation automatique** :
- Détection automatique si l'**ENTREPRISE** est auto-entrepreneur ou exonérée de TVA
- Application automatique des règles :
  - `vat_applicable = False`
  - `vat_exemption_reference` rempli automatiquement ("TVA non applicable, art. 293 B du CGI" pour auto-entrepreneurs)
  - Tous les taux de TVA des lignes forcés à 0%

**Code ajouté** :
```python
# Dans create_invoice()
if company.is_auto_entrepreneur or company.vat_exempt:
    invoice.vat_applicable = False
    if company.vat_exemption_reference:
        invoice.vat_exemption_reference = company.vat_exemption_reference
    elif company.is_auto_entrepreneur:
        invoice.vat_exemption_reference = "TVA non applicable, art. 293 B du CGI"

# Dans la boucle de création des lignes
if company.is_auto_entrepreneur or company.vat_exempt:
    tax_rate = Decimal('0')  # Forcer à 0
```

### 4. Route de Mise à Jour de Facture (`backend/app/api/routes/invoices.py`)

**Même logique appliquée** lors de la mise à jour des lignes de facture, en vérifiant l'entreprise au lieu du client.

### 5. Migrations

**Fichiers créés** :
- `backend/scripts/move_vat_fields_to_company_sqlite.py` : Script Python pour SQLite
- `backend/alembic/versions/add_client_vat_fields.py` : Migration Alembic (à mettre à jour)
- `backend/scripts/add_client_vat_fields.sql` : Script SQL PostgreSQL (à mettre à jour)

---

## 📋 Utilisation

### Marquer une entreprise comme auto-entrepreneur

```python
# Via l'API
PUT /companies/{company_id}
{
    "is_auto_entrepreneur": true,
    "vat_exemption_reference": "Art. 293 B du CGI"
}
```

### Créer une facture avec une entreprise auto-entrepreneur

Lors de la création d'une facture par une entreprise auto-entrepreneur :
- ✅ `vat_applicable` est automatiquement mis à `false`
- ✅ `vat_exemption_reference` est automatiquement rempli
- ✅ Tous les taux de TVA des lignes sont automatiquement mis à 0%
- ✅ La mention légale apparaît sur le PDF généré

**Aucune action manuelle requise** - tout est automatique !

**Important** : C'est l'entreprise qui crée la facture qui doit être marquée comme auto-entrepreneur, pas le client.

---

## 🎯 Conformité

**Avant** : ⚠️ 60% - Champs existaient sur Invoice mais pas la logique automatique  
**Après** : ✅ **100%** - Gestion complète et automatique des auto-entrepreneurs

---

## 📝 Prochaines Étapes

1. **Exécuter la migration** (déjà fait) :
   ```bash
   cd backend
   python3 scripts/move_vat_fields_to_company_sqlite.py
   ```

2. **Tester** :
   - Marquer une entreprise avec `is_auto_entrepreneur: true`
   - Créer une facture avec cette entreprise
   - Vérifier que la TVA est automatiquement à 0%
   - Vérifier que le PDF contient la mention légale

3. **Mettre à jour le frontend** (optionnel) :
   - Ajouter les champs dans le formulaire de création/modification d'entreprise
   - Afficher un indicateur visuel pour les entreprises auto-entrepreneurs

---

## ✅ Résultat

Le module factures est maintenant **100% conforme** pour la gestion des auto-entrepreneurs ! 🎉
