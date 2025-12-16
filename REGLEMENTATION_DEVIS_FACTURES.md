# Réglementation pour le Module Devis et Factures

## ⚠️ Avertissement Important

**Ce document fournit des informations générales sur les réglementations françaises. Il ne constitue pas un conseil juridique ou fiscal. Il est fortement recommandé de consulter un expert-comptable ou un avocat spécialisé pour valider la conformité de votre implémentation.**

---

## 📋 Table des matières

1. [Mentions obligatoires sur les factures](#mentions-obligatoires-sur-les-factures)
2. [Mentions obligatoires sur les devis](#mentions-obligatoires-sur-les-devis)
3. [Facturation électronique (2026-2027)](#facturation-électronique-2026-2027)
4. [Conservation et archivage](#conservation-et-archivage)
5. [Numérotation des factures](#numérotation-des-factures)
6. [TVA et calculs fiscaux](#tva-et-calculs-fiscaux)
7. [Sécurité et intégrité des données](#sécurité-et-intégrité-des-données)
8. [Checklist de conformité](#checklist-de-conformité)

---

## 1. Mentions obligatoires sur les factures

### 1.1 Mentions générales (toujours obligatoires)

Une facture doit obligatoirement contenir :

- ✅ **Numéro de facture** (unique, séquentiel, sans rupture)
- ✅ **Date d'émission** de la facture
- ✅ **Date de la vente ou de la prestation** (si différente de la date d'émission)
- ✅ **Identité complète du vendeur/prestataire** :
  - Nom ou raison sociale
  - Adresse complète
  - Numéro SIREN ou SIRET
  - Numéro de TVA intracommunautaire (si applicable)
  - Forme juridique
  - Capital social (pour les sociétés)
  - RCS (Registre du Commerce et des Sociétés) avec ville d'immatriculation
- ✅ **Identité complète du client** :
  - Nom ou raison sociale
  - Adresse complète
  - **Numéro SIREN du client** (obligatoire à partir du 1er septembre 2026)
- ✅ **Désignation détaillée des produits ou services** :
  - Description précise
  - Quantité
  - Prix unitaire HT
  - Taux de TVA applicable
  - Montant HT par ligne
- ✅ **Totaux** :
  - Total HT
  - Montant de la TVA par taux
  - Total TTC
- ✅ **Conditions de paiement** :
  - Date d'échéance
  - Modalités de paiement
  - Taux des pénalités de retard (si applicable)
  - Montant de l'indemnité forfaitaire pour frais de recouvrement (si applicable)
- ✅ **Mentions spéciales** :
  - "TVA sur les débits" (si option choisie)
  - "Exonération de TVA" (si applicable, avec référence à l'article du CGI)
  - "Autoliquidation" (si applicable)
- ✅ **Adresse de livraison** (si différente de l'adresse de facturation) - obligatoire à partir du 1er septembre 2026
- ✅ **Catégorie de l'opération** (vente, prestation de services, ou les deux) - obligatoire à partir du 1er septembre 2026

### 1.2 Mentions spécifiques selon le type d'activité

#### Pour les prestations de services :
- Lieu d'exécution de la prestation
- Date d'exécution ou période d'exécution

#### Pour les ventes de biens :
- Date de livraison
- Adresse de livraison

#### Pour les activités réglementées :
- Numéro d'autorisation d'exercer (professions réglementées)
- Numéro d'identification à la TVA du client (si différent de France)

---

## 2. Mentions obligatoires sur les devis

### 2.1 Mentions minimales

Un devis doit contenir au minimum :

- ✅ **Numéro de devis** (unique)
- ✅ **Date d'émission**
- ✅ **Date de validité** (recommandé : 30 à 90 jours)
- ✅ **Identité du prestataire** :
  - Nom ou raison sociale
  - Adresse
  - SIREN/SIRET
  - Numéro de TVA intracommunautaire (si applicable)
- ✅ **Identité du client** :
  - Nom ou raison sociale
  - Adresse
- ✅ **Description détaillée des prestations** :
  - Description
  - Quantité
  - Prix unitaire HT
  - Taux de TVA
  - Montant HT par ligne
- ✅ **Totaux** :
  - Total HT
  - TVA
  - Total TTC
- ✅ **Conditions générales de vente** (CGV) ou référence aux CGV
- ✅ **Modalités de paiement**
- ✅ **Délai d'exécution**

### 2.2 Mentions recommandées

- ✅ **Conditions d'acceptation** (signature, délai d'acceptation)
- ✅ **Conditions d'annulation**
- ✅ **Garanties**
- ✅ **Référence aux normes ou standards** (si applicable)

---

## 3. Facturation électronique (2026-2027)

### 3.1 Calendrier de mise en œuvre

#### Phase 1 : 1er septembre 2026
- **Obligation de réception** : Toutes les entreprises doivent pouvoir recevoir des factures électroniques
- **Obligation d'émission** : Grandes entreprises et ETI (Entreprises de Taille Intermédiaire)

#### Phase 2 : 1er septembre 2027
- **Obligation d'émission** : PME et micro-entreprises

### 3.2 Formats acceptés

Les factures électroniques doivent être au format :
- **Factur-X** (format hybride PDF/A-3 + XML)
- **UBL** (Universal Business Language)
- **CII** (Cross Industry Invoice)

### 3.3 Plateformes de dématérialisation (PDP)

Les entreprises doivent utiliser :
- Une **PDP certifiée** (Plateforme de Dématérialisation Partenaire)
- Ou le **PPF** (Portail Public de Facturation) géré par l'État

### 3.4 Obligations techniques

- ✅ **Inaltérabilité** : Les factures ne doivent pas pouvoir être modifiées après émission
- ✅ **Sécurisation** : Chiffrement et authentification
- ✅ **Conservation** : Archivage conforme (voir section 4)
- ✅ **Traçabilité** : Horodatage et journalisation des opérations

---

## 4. Conservation et archivage

### 4.1 Durée de conservation

- ✅ **Factures** : **10 ans** minimum (Code de commerce, article L123-22)
- ✅ **Devis** : **5 ans** minimum (recommandé : 10 ans pour la cohérence)

### 4.2 Format de conservation

- ✅ **Format original** : Conserver dans le format d'émission
- ✅ **Lisibilité** : Garantir la lisibilité pendant toute la durée de conservation
- ✅ **Intégrité** : Garantir l'intégrité (pas de modification possible)

### 4.3 Archivage électronique

Si archivage électronique :
- ✅ **Norme NF Z 42-013** (archivage électronique)
- ✅ **Horodatage qualifié** (norme ETSI TS 101 861)
- ✅ **Signature électronique** (si applicable)
- ✅ **Sauvegarde sécurisée** (backup régulier, géolocalisation)

---

## 5. Numérotation des factures

### 5.1 Règles de numérotation

- ✅ **Séquence unique** : Chaque facture doit avoir un numéro unique
- ✅ **Séquence chronologique** : Numérotation séquentielle sans rupture
- ✅ **Séquence continue** : Pas de numéro manquant (sauf brouillons supprimés)
- ✅ **Format libre** : Le format est libre (ex: FAC-2025-001, 2025-001, etc.)

### 5.2 Gestion des brouillons

- ⚠️ **Les brouillons ne doivent pas avoir de numéro définitif** jusqu'à validation
- ⚠️ **Les brouillons supprimés ne doivent pas créer de rupture dans la numérotation**
- ✅ **Système de pré-numérotation** : Réserver un numéro uniquement à la validation

### 5.3 Cas particuliers

- ✅ **Factures rectificatives** : Numéro distinct (ex: FAC-2025-001-AVOIR)
- ✅ **Factures d'acompte** : Numérotation séparée ou intégrée (à définir selon usage)
- ✅ **Factures pro forma** : Ne pas utiliser la même séquence que les factures définitives

---

## 6. TVA et calculs fiscaux

### 6.1 Taux de TVA en France (2025)

- ✅ **Taux normal** : 20%
- ✅ **Taux réduit** : 10% (restauration, transports, travaux)
- ✅ **Taux réduit** : 5,5% (produits alimentaires, énergie)
- ✅ **Taux réduit** : 2,1% (médicaments, presse)

### 6.2 Calculs obligatoires

- ✅ **Montant HT par ligne** = Quantité × Prix unitaire HT
- ✅ **Montant TVA par ligne** = Montant HT × Taux TVA
- ✅ **Total HT** = Somme des montants HT
- ✅ **Total TVA** = Somme des montants TVA
- ✅ **Total TTC** = Total HT + Total TVA

### 6.3 Arrondis

- ✅ **Arrondi à 2 décimales** pour chaque ligne
- ✅ **Arrondi final** : Total TTC arrondi au centime d'euro le plus proche
- ⚠️ **Cohérence** : Vérifier que Total TTC = Somme(HT × (1 + TVA)) arrondi

### 6.4 Cas particuliers

- ✅ **TVA sur les débits** : Mention obligatoire si option choisie
- ✅ **Exonération de TVA** : Mention de l'article du Code Général des Impôts
- ✅ **Autoliquidation** : Mention obligatoire
- ✅ **TVA intracommunautaire** : Numéro de TVA du client obligatoire

---

## 7. Sécurité et intégrité des données

### 7.1 Protection des données

- ✅ **RGPD** : Conformité avec le Règlement Général sur la Protection des Données
- ✅ **Chiffrement** : Données sensibles chiffrées (en transit et au repos)
- ✅ **Authentification** : Accès sécurisé (2FA recommandé)
- ✅ **Journalisation** : Traçabilité des actions (qui, quoi, quand)

### 7.2 Intégrité des factures

- ✅ **Immutabilité** : Une fois validée, une facture ne peut pas être modifiée
- ✅ **Versioning** : Conserver l'historique des modifications (brouillons)
- ✅ **Signature** : Signature électronique ou horodatage pour les factures électroniques
- ✅ **Audit trail** : Journal des modifications avec horodatage

### 7.3 Sauvegarde

- ✅ **Backup régulier** : Sauvegarde quotidienne minimum
- ✅ **Récupération** : Plan de reprise après sinistre (PRA)
- ✅ **Géolocalisation** : Sauvegarde dans plusieurs zones géographiques (si cloud)

---

## 8. Checklist de conformité

### 8.1 Pour les factures

- [ ] Numéro unique et séquentiel
- [ ] Date d'émission
- [ ] Identité complète du vendeur (nom, adresse, SIREN, TVA intracommunautaire, RCS, capital)
- [ ] Identité complète du client (nom, adresse, SIREN à partir de 2026)
- [ ] Description détaillée des produits/services
- [ ] Quantité, prix unitaire HT, taux TVA par ligne
- [ ] Total HT, Total TVA, Total TTC
- [ ] Conditions de paiement (date d'échéance, modalités)
- [ ] Pénalités de retard (si applicable)
- [ ] Mention "TVA sur les débits" (si applicable)
- [ ] Adresse de livraison (si différente, obligatoire à partir de 2026)
- [ ] Catégorie de l'opération (obligatoire à partir de 2026)
- [ ] Conservation 10 ans minimum
- [ ] Format électronique conforme (à partir de 2026/2027 selon taille)

### 8.2 Pour les devis

- [ ] Numéro unique
- [ ] Date d'émission
- [ ] Date de validité
- [ ] Identité du prestataire
- [ ] Identité du client
- [ ] Description détaillée
- [ ] Totaux (HT, TVA, TTC)
- [ ] Conditions générales
- [ ] Modalités de paiement
- [ ] Délai d'exécution

### 8.3 Techniques

- [ ] Numérotation sans rupture
- [ ] Calculs TVA corrects
- [ ] Arrondis cohérents
- [ ] Immutabilité des factures validées
- [ ] Archivage sécurisé (10 ans)
- [ ] Sauvegarde régulière
- [ ] Journalisation des actions
- [ ] Conformité RGPD
- [ ] Chiffrement des données sensibles
- [ ] Authentification sécurisée

### 8.4 Facturation électronique (préparation 2026-2027)

- [ ] Format Factur-X, UBL ou CII
- [ ] Intégration avec une PDP certifiée ou PPF
- [ ] Inaltérabilité garantie
- [ ] Horodatage qualifié
- [ ] Signature électronique (si applicable)

---

## 9. Recommandations d'implémentation

### 9.1 Champs à ajouter dans la base de données

```sql
-- Exemple de structure recommandée pour les factures
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,  -- Numéro unique
    issue_date DATE NOT NULL,
    sale_date DATE,  -- Date de vente/prestation
    due_date DATE NOT NULL,
    
    -- Vendeur
    seller_name VARCHAR(255) NOT NULL,
    seller_address TEXT NOT NULL,
    seller_siren VARCHAR(9) NOT NULL,
    seller_siret VARCHAR(14),
    seller_vat_number VARCHAR(20),
    seller_rcs VARCHAR(50),
    seller_legal_form VARCHAR(100),
    seller_capital DECIMAL(15,2),
    
    -- Client
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255) NOT NULL,
    client_address TEXT NOT NULL,
    client_siren VARCHAR(9) NOT NULL,  -- Obligatoire à partir de 2026
    client_delivery_address TEXT,  -- Si différente
    
    -- Totaux
    subtotal_ht DECIMAL(15,2) NOT NULL,
    total_tax DECIMAL(15,2) NOT NULL,
    total_ttc DECIMAL(15,2) NOT NULL,
    
    -- Mentions spéciales
    vat_on_debit BOOLEAN DEFAULT FALSE,
    vat_exemption_reference TEXT,
    operation_category VARCHAR(50),  -- Obligatoire à partir de 2026
    
    -- Conditions
    payment_terms TEXT,
    late_penalty_rate DECIMAL(5,2),
    recovery_fee DECIMAL(15,2),
    
    -- Statut
    status VARCHAR(50) NOT NULL,  -- brouillon, envoyée, payée, annulée
    
    -- Conservation
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    archived_at TIMESTAMP,
    
    -- Électronique
    electronic_format VARCHAR(20),  -- factur-x, ubl, cii
    pdp_id VARCHAR(100),  -- ID de la plateforme de dématérialisation
    electronic_signature TEXT,
    timestamp_qualified TIMESTAMP
);
```

### 9.2 Validation côté backend

```python
# Exemple de validation (Python/FastAPI)
from pydantic import BaseModel, validator
from datetime import date

class InvoiceCreate(BaseModel):
    number: str
    issue_date: date
    seller_siren: str
    client_siren: str  # Obligatoire à partir de 2026
    subtotal_ht: float
    total_tax: float
    total_ttc: float
    
    @validator('seller_siren')
    def validate_siren(cls, v):
        if not v or len(v) != 9 or not v.isdigit():
            raise ValueError('SIREN doit contenir 9 chiffres')
        return v
    
    @validator('client_siren')
    def validate_client_siren(cls, v):
        if not v or len(v) != 9 or not v.isdigit():
            raise ValueError('SIREN client doit contenir 9 chiffres')
        return v
    
    @validator('total_ttc')
    def validate_totals(cls, v, values):
        subtotal = values.get('subtotal_ht', 0)
        tax = values.get('total_tax', 0)
        expected_ttc = round(subtotal + tax, 2)
        if abs(v - expected_ttc) > 0.01:  # Tolérance d'arrondi
            raise ValueError('Total TTC incohérent avec HT + TVA')
        return v
```

### 9.3 Génération de numéros

```python
# Exemple de génération de numéro séquentiel
def generate_invoice_number(year: int, last_number: int) -> str:
    """
    Génère un numéro de facture séquentiel.
    Format: FAC-YYYY-NNNN
    """
    next_number = last_number + 1
    return f"FAC-{year}-{next_number:04d}"

# Vérification d'unicité
def ensure_unique_invoice_number(number: str, db_session):
    existing = db_session.query(Invoice).filter(Invoice.number == number).first()
    if existing:
        raise ValueError(f"Le numéro de facture {number} existe déjà")
```

---

## 10. Ressources et références

### 10.1 Textes officiels

- **Code de commerce** : Article L123-22 (conservation 10 ans)
- **Code général des impôts** : Articles 242 nonies A à 242 nonies E (facturation électronique)
- **Décret n° 2021-1190** : Facturation électronique
- **Arrêté du 29 décembre 2021** : Formats de facturation électronique

### 10.2 Sites officiels

- **Ministère de l'Économie** : https://www.economie.gouv.fr/facturation-electronique
- **Direction Générale des Finances Publiques** : https://www.impots.gouv.fr/
- **Agence Nationale des Titres Sécurisés (ANTS)** : https://ants.gouv.fr/

### 10.3 Normes techniques

- **NF Z 42-013** : Archivage électronique
- **Factur-X** : https://www.factur-x.org/
- **UBL** : https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=ubl
- **CII** : UN/CEFACT Cross Industry Invoice

---

## 11. Points d'attention spécifiques

### 11.1 Factures rectificatives (avoir)

- ✅ **Numéro distinct** : Ne pas réutiliser le numéro de la facture originale
- ✅ **Référence** : Référencer la facture originale
- ✅ **Mentions** : Même niveau de détail que la facture originale
- ✅ **Impact comptable** : Gérer l'impact sur la comptabilité

### 11.2 Factures d'acompte

- ✅ **Numérotation** : Décider si séquence séparée ou intégrée
- ✅ **Mention** : Indiquer clairement "Acompte"
- ✅ **Référence** : Lier à la facture finale
- ✅ **TVA** : Appliquer la TVA sur les acomptes

### 11.3 Factures pro forma

- ✅ **Distinction** : Ne pas confondre avec facture définitive
- ✅ **Numérotation** : Séquence séparée (ex: PRO-FORMA-2025-001)
- ✅ **Mention** : "PRO FORMA - Ne constitue pas une facture"

### 11.4 Export / Intracommunautaire

- ✅ **Numéro TVA client** : Obligatoire pour les ventes intracommunautaires
- ✅ **Mention** : "Exonération TVA - Article 262 ter du CGI"
- ✅ **Déclaration** : Déclaration DEB (Déclaration d'Échanges de Biens)

---

## 12. Sanctions en cas de non-conformité

### 12.1 Sanctions administratives

- ⚠️ **Amende** : 15 € par facture non conforme (plafonnée à 15 000 €)
- ⚠️ **Contrôle fiscal** : Risque de redressement
- ⚠️ **Refus de déduction TVA** : En cas de facture non conforme

### 12.2 Sanctions pénales

- ⚠️ **Faux et usage de faux** : En cas de facture falsifiée
- ⚠️ **Fraude fiscale** : Sanctions pénales possibles

---

## 📝 Notes finales

1. **Consulter un expert** : Ce document est informatif. Consultez un expert-comptable ou un avocat pour valider votre implémentation.

2. **Évolution réglementaire** : Les réglementations évoluent. Restez informé des mises à jour.

3. **Tests de conformité** : Testez votre système avec des experts avant la mise en production.

4. **Documentation** : Documentez vos choix techniques et vos validations de conformité.

5. **Formation utilisateurs** : Formez vos utilisateurs aux bonnes pratiques de facturation.

---

**Dernière mise à jour** : Janvier 2025
**Prochaine révision** : Avril 2025 (avant la mise en œuvre de la facturation électronique)
