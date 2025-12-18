"""
Services utilitaires pour la gestion des factures conformes.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.db.models.billing import Invoice, InvoiceStatus, InvoiceType, InvoiceLine


# Taux de TVA autorisés par défaut en France
DEFAULT_TVA_RATES = [Decimal('0'), Decimal('2.1'), Decimal('5.5'), Decimal('10'), Decimal('20')]


def get_valid_tax_rates(company_settings: Optional[Dict] = None) -> list[Decimal]:
    """
    Récupère la liste des taux de TVA autorisés depuis les settings de l'entreprise.
    
    Args:
        company_settings: Dictionnaire des settings de l'entreprise (optionnel)
        
    Returns:
        Liste des taux de TVA autorisés en Decimal
    """
    if company_settings and "billing" in company_settings:
        billing_settings = company_settings.get("billing", {})
        tax_rates = billing_settings.get("tax_rates", None)
        if tax_rates:
            # Convertir en Decimal
            return [Decimal(str(rate)) for rate in tax_rates]
    
    # Retourner les valeurs par défaut
    return DEFAULT_TVA_RATES.copy()


def validate_tax_rate(tax_rate: Decimal, company_settings: Optional[Dict] = None) -> bool:
    """
    Valide que le taux de TVA est autorisé.
    
    Args:
        tax_rate: Taux de TVA à valider
        company_settings: Dictionnaire des settings de l'entreprise (optionnel)
        
    Returns:
        True si le taux est valide, False sinon
    """
    valid_rates = get_valid_tax_rates(company_settings)
    return tax_rate in valid_rates


def calculate_line_totals(quantity: Decimal, unit_price: Decimal, tax_rate: Decimal) -> Dict[str, Decimal]:
    """
    Calcule les totaux d'une ligne de facture avec arrondis corrects.
    
    Args:
        quantity: Quantité
        unit_price: Prix unitaire HT
        tax_rate: Taux de TVA (en pourcentage, ex: 20 pour 20%)
        
    Returns:
        Dictionnaire avec subtotal_ht, tax_amount, total_ttc
    """
    # Calculer le sous-total HT avec arrondi à 2 décimales
    subtotal_ht = (quantity * unit_price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Calculer le montant de la TVA avec arrondi à 2 décimales
    tax_amount = (subtotal_ht * tax_rate / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Calculer le total TTC avec arrondi à 2 décimales
    total_ttc = (subtotal_ht + tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return {
        'subtotal_ht': subtotal_ht,
        'tax_amount': tax_amount,
        'total_ttc': total_ttc
    }


def validate_invoice_totals(invoice: Invoice, tolerance: Decimal = Decimal('0.01')) -> Tuple[bool, Optional[str]]:
    """
    Valide la cohérence des totaux d'une facture.
    
    Args:
        invoice: Facture à valider
        tolerance: Tolérance d'arrondi acceptée (par défaut 0.01 €)
        
    Returns:
        Tuple (is_valid, error_message)
    """
    if not invoice.lines:
        return False, "La facture doit contenir au moins une ligne"
    
    # Calculer les totaux depuis les lignes
    calculated_subtotal = sum(Decimal(str(line.subtotal_ht)) for line in invoice.lines)
    calculated_tax = sum(Decimal(str(line.tax_amount)) for line in invoice.lines)
    calculated_total = sum(Decimal(str(line.total_ttc)) for line in invoice.lines)
    
    # Récupérer les totaux de la facture
    invoice_subtotal = Decimal(str(invoice.subtotal_ht)) if invoice.subtotal_ht else Decimal('0')
    invoice_tax = Decimal(str(invoice.total_tax)) if invoice.total_tax else Decimal('0')
    invoice_total = Decimal(str(invoice.total_ttc)) if invoice.total_ttc else Decimal('0')
    
    # Vérifier la cohérence avec tolérance d'arrondi
    subtotal_diff = abs(calculated_subtotal - invoice_subtotal)
    tax_diff = abs(calculated_tax - invoice_tax)
    total_diff = abs(calculated_total - invoice_total)
    
    errors = []
    if subtotal_diff > tolerance:
        errors.append(f"Sous-total HT incohérent: calculé {calculated_subtotal}, facture {invoice_subtotal} (diff: {subtotal_diff})")
    if tax_diff > tolerance:
        errors.append(f"TVA incohérente: calculée {calculated_tax}, facture {invoice_tax} (diff: {tax_diff})")
    if total_diff > tolerance:
        errors.append(f"Total TTC incohérent: calculé {calculated_total}, facture {invoice_total} (diff: {total_diff})")
    
    if errors:
        return False, "; ".join(errors)
    
    return True, None


def generate_invoice_number(db: Session, company_id: int, invoice_type: InvoiceType = InvoiceType.FACTURE) -> str:
    """
    Génère un numéro de facture séquentiel inviolable.
    
    Le numéro est généré de manière séquentielle pour chaque entreprise et chaque année,
    sans rupture dans la séquence.
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        invoice_type: Type de facture (FACTURE ou AVOIR)
        
    Returns:
        Numéro de facture au format FAC-YYYY-NNNN ou FAC-YYYY-NNNN-AVOIR
    """
    current_year = datetime.now().year
    
    # Récupérer le dernier numéro de l'année pour cette entreprise et ce type
    # Exclure les factures supprimées
    last_invoice = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_type == invoice_type,
        Invoice.deleted_at.is_(None),
        extract('year', Invoice.created_at) == current_year
    ).order_by(Invoice.id.desc()).first()
    
    if last_invoice:
        # Extraire le numéro séquentiel du dernier numéro
        # Format: FAC-YYYY-NNNN ou FAC-YYYY-NNNN-AVOIR
        parts = last_invoice.number.split('-')
        if len(parts) >= 3:
            try:
                last_number = int(parts[2])
                next_number = last_number + 1
            except ValueError:
                # Si le format est incorrect, commencer à 1
                next_number = 1
        else:
            next_number = 1
    else:
        next_number = 1
    
    # Boucle pour trouver un numéro disponible (gestion des race conditions)
    max_attempts = 1000  # Limite de sécurité pour éviter les boucles infinies
    attempt = 0
    
    while attempt < max_attempts:
        # Générer le nouveau numéro
        if invoice_type == InvoiceType.AVOIR:
            number = f"FAC-{current_year}-{next_number:04d}-AVOIR"
        else:
            number = f"FAC-{current_year}-{next_number:04d}"
        
        # Vérifier l'unicité (inclure les factures supprimées pour éviter les doublons)
        existing = db.query(Invoice).filter(
            Invoice.number == number,
            Invoice.company_id == company_id
        ).first()
        
        if not existing:
            # Numéro disponible, on peut l'utiliser
            return number
        
        # Numéro déjà utilisé, incrémenter et réessayer
        next_number += 1
        attempt += 1
    
    # Si on arrive ici, on a épuisé toutes les tentatives
    # Générer un numéro avec timestamp pour éviter le conflit
    timestamp = int(datetime.now().timestamp() * 1000) % 10000
    if invoice_type == InvoiceType.AVOIR:
        number = f"FAC-{current_year}-{timestamp:04d}-AVOIR"
    else:
        number = f"FAC-{current_year}-{timestamp:04d}"
    
    return number


def can_modify_invoice(invoice: Invoice) -> bool:
    """
    Vérifie si une facture peut être modifiée.
    
    Seules les factures en statut "brouillon" peuvent être modifiées.
    
    Args:
        invoice: Facture à vérifier
        
    Returns:
        True si la facture peut être modifiée, False sinon
    """
    return invoice.status == InvoiceStatus.BROUILLON


def can_delete_invoice(invoice: Invoice) -> bool:
    """
    Vérifie si une facture peut être supprimée.
    
    Seules les factures en statut "brouillon" peuvent être supprimées.
    
    Args:
        invoice: Facture à vérifier
        
    Returns:
        True si la facture peut être supprimée, False sinon
    """
    return invoice.status == InvoiceStatus.BROUILLON


def recalculate_invoice_totals(invoice: Invoice) -> None:
    """
    Recalcule les totaux d'une facture à partir de ses lignes.
    
    Met à jour subtotal_ht, total_tax, total_ttc et amount de la facture.
    
    Args:
        invoice: Facture à recalculer (modifiée en place)
    """
    if not invoice.lines:
        invoice.subtotal_ht = Decimal('0')
        invoice.total_tax = Decimal('0')
        invoice.total_ttc = Decimal('0')
        invoice.amount = Decimal('0')
        return
    
    # Calculer les totaux depuis les lignes
    subtotal_ht = sum(Decimal(str(line.subtotal_ht)) for line in invoice.lines)
    total_tax = sum(Decimal(str(line.tax_amount)) for line in invoice.lines)
    total_ttc_before_discount = sum(Decimal(str(line.total_ttc)) for line in invoice.lines)
    
    # Appliquer la réduction si présente
    discount_amount = Decimal('0')
    if invoice.discount_type and invoice.discount_value is not None:
        if invoice.discount_type == "percentage":
            # Réduction en pourcentage sur le total TTC
            discount_amount = (total_ttc_before_discount * Decimal(str(invoice.discount_value))) / Decimal('100')
            # Arrondir la réduction à 2 décimales
            discount_amount = discount_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif invoice.discount_type == "fixed":
            # Réduction en montant fixe
            discount_amount = Decimal(str(invoice.discount_value))
    
    # Calculer le total TTC après réduction
    total_ttc_after_discount = total_ttc_before_discount - discount_amount
    if total_ttc_after_discount < 0:
        total_ttc_after_discount = Decimal('0')
    
    # Arrondir à 2 décimales
    invoice.subtotal_ht = subtotal_ht.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    invoice.total_tax = total_tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    invoice.total_ttc = total_ttc_after_discount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Conserver amount pour compatibilité (égal à total_ttc après réduction)
    invoice.amount = invoice.total_ttc
