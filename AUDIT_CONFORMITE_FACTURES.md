# Audit de Conformité - Module Factures

## 📋 État actuel du module factures

**Date de l'audit** : Janvier 2025  
**Version du code** : Actuelle

---

## ✅ / ❌ Vérification des règles strictes

### 1. ✔ Numérotation chronologique inviolable

**Statut** : ⚠️ **PARTIELLEMENT IMPLÉMENTÉ**

**Ce qui existe** :
- ✅ Fonction `generateInvoiceNumber()` dans `src/components/billing/utils.ts`
- ✅ Champ `number` unique dans le modèle `Invoice` (backend)
- ✅ Format : `FAC-YYYY-NNNN`

**Ce qui manque** :
- ❌ **Pas de route API backend** pour créer/gérer les factures
- ❌ **Pas de vérification de séquence** (pas de rupture dans la numérotation)
- ❌ **Pas de protection contre la modification du numéro** après création
- ❌ **Pas de génération automatique** côté backend (actuellement côté frontend uniquement)
- ❌ **Pas de table de séquence** pour garantir l'unicité et la continuité

**Recommandations** :
```python
# À implémenter dans backend/app/api/routes/invoices.py
from sqlalchemy import func
from app.db.models.billing import Invoice

def get_next_invoice_number(db: Session, company_id: int, year: int) -> str:
    """Génère le prochain numéro de facture séquentiel"""
    # Récupérer le dernier numéro de l'année
    last_invoice = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        func.extract('year', Invoice.created_at) == year
    ).order_by(Invoice.id.desc()).first()
    
    if last_invoice:
        # Extraire le numéro séquentiel du dernier numéro
        last_number = int(last_invoice.number.split('-')[-1])
        next_number = last_number + 1
    else:
        next_number = 1
    
    return f"FAC-{year}-{next_number:04d}"

# Vérification d'unicité avant insertion
def create_invoice(db: Session, invoice_data: dict):
    number = get_next_invoice_number(db, invoice_data['company_id'], datetime.now().year)
    
    # Vérifier l'unicité
    existing = db.query(Invoice).filter(Invoice.number == number).first()
    if existing:
        raise ValueError(f"Le numéro {number} existe déjà")
    
    invoice = Invoice(number=number, **invoice_data)
    db.add(invoice)
    db.commit()
    return invoice
```

---

### 2. ✔ Impossibilité de supprimer une facture validée

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ✅ Enum `InvoiceStatus` avec statuts : `ENVOYEE`, `PAYEE`, `IMPAYEE`, `EN_RETARD`
- ❌ Pas de statut `BROUILLON` dans l'enum (mais utilisé dans le frontend)

**Ce qui manque** :
- ❌ **Pas de route DELETE** pour les factures (donc pas de protection)
- ❌ **Pas de vérification du statut** avant suppression
- ❌ **Pas de soft delete** (archivage au lieu de suppression)
- ❌ **Pas de protection au niveau base de données** (contrainte, trigger)

**Recommandations** :
```python
# À implémenter dans backend/app/api/routes/invoices.py
from fastapi import HTTPException

def delete_invoice(db: Session, invoice_id: int, user_id: int):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    # Vérifier le statut - interdire la suppression si validée
    if invoice.status != InvoiceStatus.BROUILLON:  # À ajouter dans l'enum
        raise HTTPException(
            status_code=403,
            detail=f"Impossible de supprimer une facture avec le statut '{invoice.status.value}'. "
                   f"Créez un avoir à la place."
        )
    
    # Soft delete : marquer comme supprimée au lieu de supprimer
    invoice.deleted_at = datetime.now(timezone.utc)
    invoice.deleted_by_id = user_id
    
    # Log de l'action
    create_audit_log(db, {
        'action': 'invoice_deleted',
        'invoice_id': invoice_id,
        'user_id': user_id,
        'timestamp': datetime.now(timezone.utc)
    })
    
    db.commit()
    return invoice
```

**Modification du modèle** :
```python
# backend/app/db/models/billing.py
class InvoiceStatus(str, enum.Enum):
    BROUILLON = "brouillon"  # À AJOUTER
    ENVOYEE = "envoyée"
    PAYEE = "payée"
    IMPAYEE = "impayée"
    EN_RETARD = "en retard"
    ANNULEE = "annulée"  # Pour les avoirs

class Invoice(Base):
    # ... champs existants ...
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
```

---

### 3. ✔ Trace des modifications (audit log)

**Statut** : ⚠️ **PARTIELLEMENT IMPLÉMENTÉ (frontend uniquement)**

**Ce qui existe** :
- ✅ Interface `BillingHistoryEvent` et `BillingTimelineEvent` dans le frontend
- ✅ Affichage de l'historique dans l'UI (`timeline` et `history`)

**Ce qui manque** :
- ❌ **Pas de table d'audit log** dans la base de données
- ❌ **Pas de logging automatique** des modifications
- ❌ **Pas de traçabilité** des changements de statut
- ❌ **Pas de traçabilité** des modifications de montants/lignes
- ❌ **Pas de traçabilité** des suppressions

**Recommandations** :
```python
# Nouvelle table à créer : backend/app/db/models/invoice_audit.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from app.db.base import Base

class InvoiceAuditLog(Base):
    __tablename__ = "invoice_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # 'created', 'updated', 'status_changed', 'deleted', etc.
    field_name = Column(String(100), nullable=True)  # Champ modifié
    old_value = Column(Text, nullable=True)  # Ancienne valeur (JSON)
    new_value = Column(Text, nullable=True)  # Nouvelle valeur (JSON)
    description = Column(Text, nullable=True)  # Description lisible
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relations
    invoice = relationship("Invoice", backref="audit_logs")
    user = relationship("User")

# Fonction utilitaire pour créer un log
def create_audit_log(db: Session, invoice_id: int, user_id: int, action: str, 
                     field_name: str = None, old_value: Any = None, 
                     new_value: Any = None, description: str = None):
    log = InvoiceAuditLog(
        invoice_id=invoice_id,
        user_id=user_id,
        action=action,
        field_name=field_name,
        old_value=json.dumps(old_value) if old_value else None,
        new_value=json.dumps(new_value) if new_value else None,
        description=description
    )
    db.add(log)
    db.commit()
    return log

# Utilisation dans les routes
def update_invoice(db: Session, invoice_id: int, updates: dict, user_id: int):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    # Vérifier si la facture peut être modifiée
    if invoice.status != InvoiceStatus.BROUILLON:
        raise HTTPException(
            status_code=403,
            detail="Impossible de modifier une facture validée"
        )
    
    # Logger chaque modification
    for field, new_value in updates.items():
        old_value = getattr(invoice, field, None)
        if old_value != new_value:
            create_audit_log(
                db, invoice_id, user_id,
                action='field_updated',
                field_name=field,
                old_value=old_value,
                new_value=new_value,
                description=f"{field} modifié de '{old_value}' à '{new_value}'"
            )
            setattr(invoice, field, new_value)
    
    db.commit()
    return invoice
```

---

### 4. ✔ Mentions légales obligatoires complètes

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ✅ Champs de base dans le modèle : `number`, `amount`, `status`, `notes`
- ❌ Pas de champs pour les mentions légales obligatoires

**Ce qui manque** :
- ❌ **Informations vendeur** : SIREN, SIRET, adresse complète, RCS, capital, TVA intracommunautaire
- ❌ **Informations client** : SIREN (obligatoire à partir de 2026), adresse complète
- ❌ **Détails des lignes** : description, quantité, prix unitaire HT, taux TVA
- ❌ **Totaux détaillés** : Total HT, TVA par taux, Total TTC
- ❌ **Conditions de paiement** : date d'échéance, modalités, pénalités
- ❌ **Mentions spéciales** : TVA sur les débits, exonération, autoliquidation
- ❌ **Adresse de livraison** (si différente)
- ❌ **Catégorie de l'opération** (obligatoire à partir de 2026)

**Recommandations** :
```python
# Modèle à étendre : backend/app/db/models/billing.py

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit_price_ht = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)  # 20, 10, 5.5, 2.1, 0
    subtotal_ht = Column(Numeric(10, 2), nullable=False)  # quantity * unit_price_ht
    tax_amount = Column(Numeric(10, 2), nullable=False)  # subtotal_ht * tax_rate / 100
    total_ttc = Column(Numeric(10, 2), nullable=False)  # subtotal_ht + tax_amount
    order = Column(Integer, nullable=False)  # Ordre d'affichage
    
    invoice = relationship("Invoice", backref="lines")

class Invoice(Base):
    __tablename__ = "invoices"
    
    # ... champs existants ...
    
    # Informations vendeur (peuvent venir de Company)
    seller_name = Column(String(255), nullable=False)
    seller_address = Column(Text, nullable=False)
    seller_siren = Column(String(9), nullable=False)
    seller_siret = Column(String(14), nullable=True)
    seller_vat_number = Column(String(20), nullable=True)  # TVA intracommunautaire
    seller_rcs = Column(String(100), nullable=True)  # RCS avec ville
    seller_legal_form = Column(String(100), nullable=True)
    seller_capital = Column(Numeric(15, 2), nullable=True)
    
    # Informations client
    client_name = Column(String(255), nullable=False)
    client_address = Column(Text, nullable=False)
    client_siren = Column(String(9), nullable=False)  # Obligatoire à partir de 2026
    client_delivery_address = Column(Text, nullable=True)  # Si différente
    
    # Dates
    issue_date = Column(DateTime(timezone=True), nullable=False)  # Date d'émission
    sale_date = Column(DateTime(timezone=True), nullable=True)  # Date de vente/prestation
    due_date = Column(DateTime(timezone=True), nullable=False)  # Date d'échéance
    
    # Totaux
    subtotal_ht = Column(Numeric(10, 2), nullable=False)
    total_tax = Column(Numeric(10, 2), nullable=False)
    total_ttc = Column(Numeric(10, 2), nullable=False)
    
    # Conditions
    payment_terms = Column(Text, nullable=True)  # Modalités de paiement
    late_penalty_rate = Column(Numeric(5, 2), nullable=True)  # Taux pénalités
    recovery_fee = Column(Numeric(10, 2), nullable=True)  # Indemnité forfaitaire
    
    # Mentions spéciales
    vat_on_debit = Column(Boolean, default=False)  # TVA sur les débits
    vat_exemption_reference = Column(Text, nullable=True)  # Référence article CGI
    operation_category = Column(String(50), nullable=True)  # vente, prestation, les deux
    
    # Notes
    notes = Column(Text, nullable=True)  # Notes internes
    conditions = Column(Text, nullable=True)  # Conditions générales
```

---

### 5. ✔ Génération PDF conforme

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ❌ Aucune génération PDF

**Ce qui manque** :
- ❌ **Bibliothèque PDF** (ex: jsPDF, PDFKit, WeasyPrint)
- ❌ **Template de facture** conforme aux mentions légales
- ❌ **Génération automatique** à la validation
- ❌ **Stockage du PDF** généré
- ❌ **Format Factur-X** (obligatoire à partir de 2026/2027)

**Recommandations** :
```python
# Backend : utiliser reportlab ou weasyprint
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

def generate_invoice_pdf(invoice: Invoice) -> bytes:
    """Génère un PDF de facture conforme"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # En-tête avec mentions légales
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20*mm, 280*mm, "FACTURE")
    c.drawString(20*mm, 270*mm, f"N° {invoice.number}")
    
    # Informations vendeur
    c.setFont("Helvetica", 10)
    c.drawString(20*mm, 250*mm, invoice.seller_name)
    c.drawString(20*mm, 245*mm, invoice.seller_address)
    c.drawString(20*mm, 240*mm, f"SIREN: {invoice.seller_siren}")
    if invoice.seller_vat_number:
        c.drawString(20*mm, 235*mm, f"TVA: {invoice.seller_vat_number}")
    
    # Informations client
    c.drawString(120*mm, 250*mm, invoice.client_name)
    c.drawString(120*mm, 245*mm, invoice.client_address)
    c.drawString(120*mm, 240*mm, f"SIREN: {invoice.client_siren}")
    
    # Lignes de facture
    y = 220*mm
    for line in invoice.lines:
        c.drawString(20*mm, y, line.description)
        c.drawString(100*mm, y, f"{line.quantity}")
        c.drawString(120*mm, y, f"{line.unit_price_ht:.2f} €")
        c.drawString(140*mm, y, f"{line.tax_rate}%")
        c.drawString(160*mm, y, f"{line.total_ttc:.2f} €")
        y -= 5*mm
    
    # Totaux
    c.drawString(140*mm, y-10*mm, f"Total HT: {invoice.subtotal_ht:.2f} €")
    c.drawString(140*mm, y-15*mm, f"TVA: {invoice.total_tax:.2f} €")
    c.drawString(140*mm, y-20*mm, f"Total TTC: {invoice.total_ttc:.2f} €")
    
    c.save()
    return buffer.getvalue()

# Route API
@router.post("/invoices/{invoice_id}/pdf")
def generate_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(content=pdf_bytes, media_type="application/pdf")
```

---

### 6. ✔ Archivage possible

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ❌ Aucun système d'archivage

**Ce qui manque** :
- ❌ **Champ `archived_at`** dans le modèle
- ❌ **Route d'archivage** manuelle
- ❌ **Archivage automatique** après 10 ans
- ❌ **Stockage sécurisé** (conformité NF Z 42-013)
- ❌ **Horodatage qualifié** pour les factures électroniques

**Recommandations** :
```python
# Modèle
class Invoice(Base):
    # ... autres champs ...
    archived_at = Column(DateTime(timezone=True), nullable=True)
    archived_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

# Route d'archivage
@router.post("/invoices/{invoice_id}/archive")
def archive_invoice(invoice_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if invoice.archived_at:
        raise HTTPException(status_code=400, detail="Facture déjà archivée")
    
    invoice.archived_at = datetime.now(timezone.utc)
    invoice.archived_by_id = current_user.id
    
    # Générer et stocker le PDF si pas déjà fait
    if not invoice.pdf_path:
        pdf_bytes = generate_invoice_pdf(invoice)
        pdf_path = save_pdf_to_storage(invoice, pdf_bytes)
        invoice.pdf_path = pdf_path
    
    # Horodatage qualifié (pour facturation électronique)
    if invoice.electronic_format:
        invoice.timestamp_qualified = get_qualified_timestamp()
    
    db.commit()
    
    create_audit_log(db, invoice_id, current_user.id, 'archived')
    
    return invoice

# Archivage automatique (cron job)
def auto_archive_old_invoices(db: Session):
    """Archive les factures de plus de 10 ans"""
    ten_years_ago = datetime.now(timezone.utc) - timedelta(days=3650)
    
    invoices = db.query(Invoice).filter(
        Invoice.archived_at.is_(None),
        Invoice.created_at < ten_years_ago
    ).all()
    
    for invoice in invoices:
        invoice.archived_at = datetime.now(timezone.utc)
        create_audit_log(db, invoice.id, None, 'auto_archived')
    
    db.commit()
    return len(invoices)
```

---

### 7. ✔ Gestion des avoirs et rectificatifs

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ❌ Aucune gestion d'avoir

**Ce qui manque** :
- ❌ **Type de document** : facture vs avoir
- ❌ **Lien avoir → facture originale**
- ❌ **Numérotation distincte** pour les avoirs
- ❌ **Impact comptable** (annulation partielle/totale)
- ❌ **Validation** que le montant de l'avoir ≤ montant facture

**Recommandations** :
```python
# Modèle
class InvoiceType(str, enum.Enum):
    FACTURE = "facture"
    AVOIR = "avoir"  # Facture rectificative

class Invoice(Base):
    # ... autres champs ...
    invoice_type = Column(Enum(InvoiceType), nullable=False, default=InvoiceType.FACTURE)
    original_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)  # Pour les avoirs
    credit_amount = Column(Numeric(10, 2), nullable=True)  # Montant crédité (pour avoirs)
    
    # Relation
    original_invoice = relationship("Invoice", remote_side=[id], backref="credit_notes")

# Route de création d'avoir
@router.post("/invoices/{invoice_id}/credit-note")
def create_credit_note(invoice_id: int, credit_data: CreditNoteCreate, 
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    original_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not original_invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    # Vérifier que le montant crédité ne dépasse pas le montant de la facture
    total_credits = db.query(func.sum(Invoice.credit_amount)).filter(
        Invoice.original_invoice_id == invoice_id
    ).scalar() or 0
    
    if total_credits + credit_data.amount > original_invoice.total_ttc:
        raise HTTPException(
            status_code=400,
            detail=f"Le montant total des avoirs ({total_credits + credit_data.amount} €) "
                  f"dépasse le montant de la facture ({original_invoice.total_ttc} €)"
        )
    
    # Générer le numéro d'avoir
    credit_number = generate_credit_note_number(db, original_invoice.company_id)
    
    # Créer l'avoir
    credit_note = Invoice(
        invoice_type=InvoiceType.AVOIR,
        original_invoice_id=invoice_id,
        number=credit_number,
        company_id=original_invoice.company_id,
        client_id=original_invoice.client_id,
        credit_amount=credit_data.amount,
        # ... autres champs depuis original_invoice ...
    )
    
    db.add(credit_note)
    db.commit()
    
    create_audit_log(db, invoice_id, current_user.id, 'credit_note_created', 
                     description=f"Avoir {credit_number} créé")
    
    return credit_note

def generate_credit_note_number(db: Session, company_id: int) -> str:
    """Génère un numéro d'avoir : FAC-YYYY-NNNN-AVOIR"""
    year = datetime.now().year
    last_credit = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_type == InvoiceType.AVOIR,
        func.extract('year', Invoice.created_at) == year
    ).order_by(Invoice.id.desc()).first()
    
    if last_credit:
        last_number = int(last_credit.number.split('-')[2])
        next_number = last_number + 1
    else:
        next_number = 1
    
    return f"FAC-{year}-{next_number:04d}-AVOIR"
```

---

### 8. ✔ Gestion de la TVA correctement

**Statut** : ⚠️ **PARTIELLEMENT IMPLÉMENTÉ**

**Ce qui existe** :
- ✅ Calculs TVA dans `src/components/billing/utils.ts` :
  - `calculateTax()` : calcule la TVA totale
  - `calculateLineTotal()` : calcule le total TTC d'une ligne
  - `calculateTotal()` : calcule le total TTC

**Ce qui manque** :
- ❌ **Validation des taux de TVA** (20%, 10%, 5.5%, 2.1%, 0%)
- ❌ **Gestion TVA par ligne** (taux différents possibles)
- ❌ **Arrondis corrects** (2 décimales, cohérence)
- ❌ **Vérification cohérence** : Total TTC = Total HT + Total TVA
- ❌ **Gestion TVA sur les débits** (option)
- ❌ **Gestion exonération TVA** (référence article CGI)
- ❌ **Gestion autoliquidation**

**Recommandations** :
```python
# Validation des taux de TVA
VALID_TVA_RATES = [0, 2.1, 5.5, 10, 20]

def validate_tax_rate(tax_rate: float) -> bool:
    """Valide que le taux de TVA est autorisé"""
    return tax_rate in VALID_TVA_RATES

# Calcul avec arrondis corrects
from decimal import Decimal, ROUND_HALF_UP

def calculate_line_totals(quantity: Decimal, unit_price: Decimal, tax_rate: Decimal) -> dict:
    """Calcule les totaux d'une ligne avec arrondis corrects"""
    subtotal_ht = (quantity * unit_price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    tax_amount = (subtotal_ht * tax_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total_ttc = (subtotal_ht + tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return {
        'subtotal_ht': subtotal_ht,
        'tax_amount': tax_amount,
        'total_ttc': total_ttc
    }

def validate_invoice_totals(invoice: Invoice) -> bool:
    """Valide la cohérence des totaux"""
    calculated_subtotal = sum(line.subtotal_ht for line in invoice.lines)
    calculated_tax = sum(line.tax_amount for line in invoice.lines)
    calculated_total = sum(line.total_ttc for line in invoice.lines)
    
    # Tolérance d'arrondi : 0.01 €
    tolerance = Decimal('0.01')
    
    subtotal_ok = abs(calculated_subtotal - invoice.subtotal_ht) <= tolerance
    tax_ok = abs(calculated_tax - invoice.total_tax) <= tolerance
    total_ok = abs(calculated_total - invoice.total_ttc) <= tolerance
    
    return subtotal_ok and tax_ok and total_ok
```

---

### 9. ✔ TVA non applicable (auto-entrepreneurs) si nécessaire

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ❌ Aucune gestion des auto-entrepreneurs

**Ce qui manque** :
- ❌ **Champ pour indiquer** si TVA non applicable
- ❌ **Mention légale** sur la facture ("TVA non applicable, art. 293 B du CGI")
- ❌ **Validation** selon le type de client (auto-entrepreneur)

**Recommandations** :
```python
# Modèle Client
class Client(Base):
    # ... autres champs ...
    is_auto_entrepreneur = Column(Boolean, default=False)
    vat_exempt = Column(Boolean, default=False)  # Exonération TVA
    vat_exemption_reference = Column(String(100), nullable=True)  # Article CGI

# Modèle Invoice
class Invoice(Base):
    # ... autres champs ...
    vat_applicable = Column(Boolean, default=True)  # TVA applicable ou non
    vat_exemption_reference = Column(Text, nullable=True)  # "Art. 293 B du CGI" pour auto-entrepreneurs

# Validation lors de la création
def create_invoice(db: Session, invoice_data: dict):
    client = db.query(Client).filter(Client.id == invoice_data['client_id']).first()
    
    # Si client auto-entrepreneur, TVA non applicable
    if client.is_auto_entrepreneur:
        invoice_data['vat_applicable'] = False
        invoice_data['vat_exemption_reference'] = "TVA non applicable, art. 293 B du CGI"
        
        # Mettre tous les taux de TVA à 0
        for line in invoice_data['lines']:
            line['tax_rate'] = 0
    
    # ... création de la facture ...
```

---

### 10. ✔ Rien ne modifie une facture après validation

**Statut** : ❌ **NON IMPLÉMENTÉ**

**Ce qui existe** :
- ✅ Enum `InvoiceStatus` avec différents statuts
- ❌ Pas de protection contre la modification

**Ce qui manque** :
- ❌ **Vérification du statut** avant toute modification
- ❌ **Blocage des modifications** si statut != "brouillon"
- ❌ **Protection au niveau base de données** (trigger, contrainte)
- ❌ **Protection au niveau API** (middleware, validation)

**Recommandations** :
```python
# Fonction de vérification
def can_modify_invoice(invoice: Invoice) -> bool:
    """Vérifie si une facture peut être modifiée"""
    return invoice.status == InvoiceStatus.BROUILLON

# Protection dans toutes les routes de modification
@router.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, updates: InvoiceUpdate, 
                  db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    # VÉRIFICATION CRITIQUE
    if not can_modify_invoice(invoice):
        raise HTTPException(
            status_code=403,
            detail=f"Impossible de modifier une facture avec le statut '{invoice.status.value}'. "
                   f"Créez un avoir pour corriger une facture validée."
        )
    
    # Logger les modifications
    for field, new_value in updates.dict(exclude_unset=True).items():
        old_value = getattr(invoice, field, None)
        if old_value != new_value:
            create_audit_log(db, invoice_id, current_user.id, 'field_updated',
                           field_name=field, old_value=old_value, new_value=new_value)
            setattr(invoice, field, new_value)
    
    db.commit()
    return invoice

# Protection au niveau base de données (trigger PostgreSQL)
"""
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'brouillon' AND OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Impossible de modifier une facture avec le statut %', OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_invoice_status_before_update
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_modification();
"""
```

---

## 📊 Résumé de l'audit

| Règle | Statut | Priorité |
|-------|--------|----------|
| 1. Numérotation chronologique inviolable | ⚠️ Partiel | 🔴 Critique |
| 2. Impossibilité de supprimer une facture validée | ❌ Non implémenté | 🔴 Critique |
| 3. Trace des modifications (audit log) | ⚠️ Partiel (frontend) | 🔴 Critique |
| 4. Mentions légales obligatoires complètes | ❌ Non implémenté | 🔴 Critique |
| 5. Génération PDF conforme | ❌ Non implémenté | 🟡 Important |
| 6. Archivage possible | ❌ Non implémenté | 🟡 Important |
| 7. Gestion des avoirs et rectificatifs | ❌ Non implémenté | 🟡 Important |
| 8. Gestion de la TVA correctement | ⚠️ Partiel | 🔴 Critique |
| 9. TVA non applicable (auto-entrepreneurs) | ❌ Non implémenté | 🟢 Moyen |
| 10. Rien ne modifie une facture après validation | ❌ Non implémenté | 🔴 Critique |

**Score de conformité** : **2/10** (20%)

---

## 🚨 Actions prioritaires

### Phase 1 - Critiques (à faire immédiatement)

1. **Créer les routes API backend** pour les factures
2. **Implémenter la protection contre modification** après validation
3. **Ajouter le système d'audit log** complet
4. **Étendre le modèle** avec toutes les mentions légales
5. **Valider les calculs TVA** avec arrondis corrects

### Phase 2 - Importantes (à faire rapidement)

6. **Génération PDF** conforme
7. **Système d'archivage**
8. **Gestion des avoirs**

### Phase 3 - Améliorations

9. **Gestion auto-entrepreneurs**
10. **Optimisations et tests**

---

## ⚠️ Conclusion

**Le module factures n'est actuellement PAS conforme** aux règles strictes demandées. Il nécessite une refonte complète du backend avec :

- ✅ Routes API complètes
- ✅ Protection contre les modifications
- ✅ Audit log complet
- ✅ Mentions légales complètes
- ✅ Validation stricte des données

**Recommandation** : Ne pas utiliser ce module en production avant d'avoir implémenté au minimum les règles critiques (Phase 1).
