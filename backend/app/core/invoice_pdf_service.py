"""
Service de génération PDF pour les factures conformes.
Utilise reportlab pour générer des PDFs avec toutes les mentions légales.
"""
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import black, HexColor
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from app.db.models.billing import Invoice


def format_amount(amount: Decimal) -> str:
    """Formate un montant en euros."""
    return f"{amount:.2f} €".replace('.', ',')


def format_date(date: Optional[datetime]) -> str:
    """Formate une date en français."""
    if not date:
        return ""
    return date.strftime("%d/%m/%Y")


def generate_invoice_pdf(invoice: Invoice) -> bytes:
    """
    Génère un PDF de facture conforme avec toutes les mentions légales.
    
    Args:
        invoice: Facture à convertir en PDF
        
    Returns:
        Bytes du PDF généré
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError(
            "reportlab n'est pas installé. Installez-le avec: pip install reportlab"
        )
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=black,
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    # Couleurs
    orange = HexColor('#F97316')
    dark_gray = HexColor('#0F172A')
    light_gray = HexColor('#64748B')
    
    y = height - 20 * mm
    margin = 20 * mm
    
    # ========================================================================
    # EN-TÊTE : Titre et numéro
    # ========================================================================
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(orange)
    c.drawString(margin, y, "FACTURE" if invoice.invoice_type.value == "facture" else "AVOIR")
    
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(dark_gray)
    c.drawString(margin, y - 8 * mm, f"N° {invoice.number}")
    
    y -= 20 * mm
    
    # ========================================================================
    # INFORMATIONS VENDEUR (Gauche)
    # ========================================================================
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(dark_gray)
    c.drawString(margin, y, "Vendeur / Prestataire")
    
    y -= 6 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(black)
    
    if invoice.seller_name:
        c.drawString(margin, y, invoice.seller_name)
        y -= 4 * mm
    
    if invoice.seller_address:
        # Gérer les retours à la ligne pour l'adresse
        address_lines = invoice.seller_address.split('\n')
        for line in address_lines[:3]:  # Limiter à 3 lignes
            c.drawString(margin, y, line)
            y -= 4 * mm
    
    if invoice.seller_siren:
        c.drawString(margin, y, f"SIREN: {invoice.seller_siren}")
        y -= 4 * mm
    
    if invoice.seller_siret:
        c.drawString(margin, y, f"SIRET: {invoice.seller_siret}")
        y -= 4 * mm
    
    if invoice.seller_vat_number:
        c.drawString(margin, y, f"TVA intracommunautaire: {invoice.seller_vat_number}")
        y -= 4 * mm
    
    if invoice.seller_rcs:
        c.drawString(margin, y, f"RCS: {invoice.seller_rcs}")
        y -= 4 * mm
    
    if invoice.seller_legal_form:
        c.drawString(margin, y, f"Forme juridique: {invoice.seller_legal_form}")
        y -= 4 * mm
    
    if invoice.seller_capital:
        c.drawString(margin, y, f"Capital: {format_amount(Decimal(str(invoice.seller_capital)))}")
        y -= 4 * mm
    
    # ========================================================================
    # INFORMATIONS CLIENT (Droite)
    # ========================================================================
    client_y_start = height - 20 * mm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(dark_gray)
    # Pour les avoirs, afficher "Crédité à" au lieu de "Client"
    if invoice.invoice_type.value == "avoir":
        c.drawString(120 * mm, client_y_start, "Crédité à")
    else:
        c.drawString(120 * mm, client_y_start, "Client")
    
    client_y = client_y_start - 6 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(black)
    
    if invoice.client_name:
        c.drawString(120 * mm, client_y, invoice.client_name)
        client_y -= 4 * mm
    
    if invoice.client_address:
        address_lines = invoice.client_address.split('\n')
        for line in address_lines[:3]:
            c.drawString(120 * mm, client_y, line)
            client_y -= 4 * mm
    
    if invoice.client_siren:
        c.drawString(120 * mm, client_y, f"SIREN: {invoice.client_siren}")
        client_y -= 4 * mm
    
    if invoice.client_delivery_address and invoice.client_delivery_address != invoice.client_address:
        client_y -= 2 * mm
        c.setFont("Helvetica-Bold", 8)
        c.drawString(120 * mm, client_y, "Adresse de livraison:")
        client_y -= 3 * mm
        c.setFont("Helvetica", 8)
        delivery_lines = invoice.client_delivery_address.split('\n')
        for line in delivery_lines[:2]:
            c.drawString(120 * mm, client_y, line)
            client_y -= 3 * mm
    
    # ========================================================================
    # DATES
    # ========================================================================
    y = min(y, client_y) - 10 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(light_gray)
    
    if invoice.issue_date:
        c.drawString(margin, y, f"Date d'émission: {format_date(invoice.issue_date)}")
        y -= 4 * mm
    
    if invoice.sale_date:
        c.drawString(margin, y, f"Date de vente/prestation: {format_date(invoice.sale_date)}")
        y -= 4 * mm
    
    if invoice.due_date:
        c.drawString(margin, y, f"Date d'échéance: {format_date(invoice.due_date)}")
        y -= 4 * mm
    
    # ========================================================================
    # LIGNES DE FACTURE
    # ========================================================================
    y -= 10 * mm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(dark_gray)
    c.drawString(margin, y, "Détail des prestations")
    
    y -= 6 * mm
    
    # En-tête du tableau
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(black)
    table_y = y
    
    # Colonnes: Description, Qté, Prix unitaire HT, TVA, Total TTC
    col_widths = [80 * mm, 20 * mm, 25 * mm, 20 * mm, 25 * mm]
    col_x = [margin, margin + 80 * mm, margin + 100 * mm, margin + 125 * mm, margin + 145 * mm]
    
    c.drawString(col_x[0], table_y, "Description")
    c.drawString(col_x[1], table_y, "Qté")
    c.drawString(col_x[2], table_y, "Prix unit. HT")
    c.drawString(col_x[3], table_y, "TVA %")
    c.drawString(col_x[4], table_y, "Total TTC")
    
    # Ligne de séparation
    table_y -= 2 * mm
    c.line(margin, table_y, width - margin, table_y)
    table_y -= 3 * mm
    
    # Lignes de facture
    c.setFont("Helvetica", 8)
    for line in sorted(invoice.lines, key=lambda l: l.order):
        # Description (peut être sur plusieurs lignes)
        desc_lines = line.description.split('\n')[:2]  # Max 2 lignes
        for i, desc_line in enumerate(desc_lines):
            if len(desc_line) > 60:
                desc_line = desc_line[:57] + "..."
            c.drawString(col_x[0], table_y - i * 3 * mm, desc_line)
        
        # Quantité
        c.drawString(col_x[1], table_y, str(line.quantity))
        
        # Prix unitaire HT
        c.drawString(col_x[2], table_y, format_amount(Decimal(str(line.unit_price_ht))))
        
        # TVA
        c.drawString(col_x[3], table_y, f"{line.tax_rate}%")
        
        # Total TTC
        c.drawString(col_x[4], table_y, format_amount(Decimal(str(line.total_ttc))))
        
        table_y -= max(6 * mm, len(desc_lines) * 3 * mm + 3 * mm)
        
        # Nouvelle page si nécessaire
        if table_y < 80 * mm:
            c.showPage()
            table_y = height - 40 * mm
    
    # ========================================================================
    # TOTAUX
    # ========================================================================
    totals_y = table_y - 10 * mm
    
    # Ligne de séparation
    c.line(margin, totals_y, width - margin, totals_y)
    totals_y -= 5 * mm
    
    c.setFont("Helvetica", 9)
    
    # Sous-total HT
    if invoice.subtotal_ht:
        c.drawString(120 * mm, totals_y, "Sous-total HT:")
        c.drawString(170 * mm, totals_y, format_amount(Decimal(str(invoice.subtotal_ht))))
        totals_y -= 5 * mm
    
    # TVA
    if invoice.total_tax:
        c.drawString(120 * mm, totals_y, "TVA:")
        c.drawString(170 * mm, totals_y, format_amount(Decimal(str(invoice.total_tax))))
        totals_y -= 5 * mm
    
    # Réduction si présente
    if invoice.discount_type and invoice.discount_value is not None:
        # Calculer le total TTC avant réduction pour l'affichage (convertir en Decimal)
        total_ttc_before_discount = sum(Decimal(str(line.total_ttc)) for line in invoice.lines) if invoice.lines else Decimal('0')
        
        discount_label = invoice.discount_label or "Réduction"
        if invoice.discount_type == "percentage":
            discount_amount = (total_ttc_before_discount * Decimal(str(invoice.discount_value))) / Decimal('100')
            # Arrondir le montant de la réduction à 2 décimales
            from decimal import ROUND_HALF_UP
            discount_amount = discount_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            discount_display = f"{discount_label} ({invoice.discount_value:.2f}%)"
        else:  # fixed
            discount_amount = Decimal(str(invoice.discount_value))
            discount_display = discount_label
        
        c.setFont("Helvetica", 9)
        c.setFillColor(black)
        c.drawString(120 * mm, totals_y, discount_display + ":")
        c.drawString(170 * mm, totals_y, "-" + format_amount(discount_amount))
        totals_y -= 5 * mm
    
    # Total TTC (ou Montant crédité pour les avoirs)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(dark_gray)
    if invoice.invoice_type.value == "avoir":
        c.drawString(120 * mm, totals_y, "Montant crédité:")
        # Pour les avoirs, utiliser credit_amount si disponible, sinon total_ttc
        credit_amount = invoice.credit_amount if invoice.credit_amount else (invoice.total_ttc or invoice.amount or Decimal('0'))
        c.drawString(170 * mm, totals_y, format_amount(Decimal(str(credit_amount))))
    else:
        c.drawString(120 * mm, totals_y, "Total TTC:")
        c.drawString(170 * mm, totals_y, format_amount(Decimal(str(invoice.total_ttc or invoice.amount))))
    totals_y -= 8 * mm
    
    # ========================================================================
    # MENTIONS SPÉCIALES
    # ========================================================================
    if invoice.vat_on_debit:
        c.setFont("Helvetica", 8)
        c.setFillColor(black)
        c.drawString(margin, totals_y, "TVA sur les débits")
        totals_y -= 4 * mm
    
    if invoice.vat_exemption_reference:
        c.setFont("Helvetica", 8)
        c.setFillColor(black)
        c.drawString(margin, totals_y, f"Exonération TVA: {invoice.vat_exemption_reference}")
        totals_y -= 4 * mm
    
    if invoice.operation_category:
        c.setFont("Helvetica", 8)
        c.setFillColor(black)
        c.drawString(margin, totals_y, f"Catégorie: {invoice.operation_category}")
        totals_y -= 4 * mm
    
    # ========================================================================
    # CONDITIONS DE PAIEMENT
    # ========================================================================
    if invoice.payment_terms or invoice.conditions:
        totals_y -= 8 * mm
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(dark_gray)
        c.drawString(margin, totals_y, "Conditions de paiement")
        totals_y -= 5 * mm
        
        c.setFont("Helvetica", 8)
        c.setFillColor(black)
        
        if invoice.payment_terms:
            terms_lines = invoice.payment_terms.split('\n')[:3]
            for line in terms_lines:
                c.drawString(margin, totals_y, line)
                totals_y -= 4 * mm
        
        if invoice.late_penalty_rate:
            c.drawString(margin, totals_y, f"Pénalités de retard: {invoice.late_penalty_rate}%")
            totals_y -= 4 * mm
        
        if invoice.recovery_fee:
            c.drawString(margin, totals_y, f"Indemnité forfaitaire: {format_amount(Decimal(str(invoice.recovery_fee)))}")
            totals_y -= 4 * mm
        
        if invoice.conditions:
            conditions_lines = invoice.conditions.split('\n')[:4]
            for line in conditions_lines:
                c.drawString(margin, totals_y, line)
                totals_y -= 4 * mm
    
    # ========================================================================
    # NOTES
    # ========================================================================
    if invoice.notes:
        totals_y -= 8 * mm
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(dark_gray)
        c.drawString(margin, totals_y, "Notes")
        totals_y -= 5 * mm
        
        c.setFont("Helvetica", 8)
        c.setFillColor(black)
        notes_lines = invoice.notes.split('\n')[:5]
        for line in notes_lines:
            c.drawString(margin, totals_y, line)
            totals_y -= 4 * mm
    
    # ========================================================================
    # PIED DE PAGE
    # ========================================================================
    footer_y = 20 * mm
    c.setFont("Helvetica", 7)
    c.setFillColor(light_gray)
    # Afficher "Avoir généré" pour les avoirs, "Facture générée" pour les factures
    document_type = "Avoir généré" if invoice.invoice_type.value == "avoir" else "Facture générée"
    c.drawString(margin, footer_y, f"{document_type} le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
    
    # Finaliser le PDF
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
