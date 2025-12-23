"""
Service pour générer des PDFs de devis avec design moderne et personnalisable.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.lib.utils import ImageReader
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any
from pathlib import Path
from app.db.models.billing import Quote, QuoteLine
from app.db.models.client import Client
from app.db.models.company import Company
from app.core.config import settings


def draw_header_on_canvas(canvas_obj, doc, primary_color, secondary_color, logo_path=None, company_name=None):
    """Dessine l'en-tête moderne avec les couleurs personnalisées."""
    canvas_obj.saveState()
    
    # Bande diagonale principale (coin supérieur gauche, traverse la page)
    canvas_obj.setFillColor(colors.HexColor(primary_color))
    canvas_obj.setStrokeColor(colors.HexColor(primary_color))
    
    # Grande bande diagonale qui traverse le haut de la page
    # Ratio largeur/hauteur pour avoir le même angle que le triangle du bas
    triangle_width = 140*mm  # Largeur horizontale
    triangle_height = 30*mm   # Hauteur verticale (réduite par 3 : 90mm / 3 = 30mm)
    path = canvas_obj.beginPath()
    path.moveTo(0, A4[1])  # Coin supérieur gauche
    path.lineTo(triangle_width, A4[1])  # Vers la droite
    path.lineTo(0, A4[1] - triangle_height)  # Vers le bas à gauche
    path.close()
    canvas_obj.drawPath(path, fill=1, stroke=0)
    
    # Titre "DEVIS" en blanc sur la bande rose (grand et en gras)
    canvas_obj.setFillColor(colors.white)
    canvas_obj.setFont("Helvetica-Bold", 48)
    canvas_obj.drawString(20*mm, A4[1] - 50*mm, "DEVIS")
    
    # Logo si disponible (en haut à droite, sur fond blanc)
    logo_loaded = False
    if logo_path and Path(logo_path).exists():
        try:
            from PIL import Image as PILImage
            import io
            
            # Ouvrir l'image avec PIL
            pil_image = PILImage.open(logo_path)
            
            # Convertir les images transparentes en RGB avec fond blanc pour les PDFs
            # (ReportLab ne gère pas bien la transparence PNG)
            if pil_image.mode in ('RGBA', 'LA', 'P'):
                # Convertir en RGBA si nécessaire
                if pil_image.mode == 'P':
                    pil_image = pil_image.convert('RGBA')
                elif pil_image.mode == 'LA':
                    # Convertir LA en RGBA
                    rgba_img = PILImage.new('RGBA', pil_image.size)
                    rgb_part = pil_image.convert('RGB')
                    alpha = pil_image.split()[-1] if len(pil_image.split()) > 1 else None
                    rgba_img.paste(rgb_part, (0, 0))
                    if alpha:
                        rgba_img.putalpha(alpha)
                    pil_image = rgba_img
                
                # Créer un fond blanc
                rgb_image = PILImage.new('RGB', pil_image.size, (255, 255, 255))
                
                # Extraire les canaux RGB et alpha
                r, g, b, a = pil_image.split()
                
                # Créer une image RGB temporaire
                rgb_temp = PILImage.merge('RGB', (r, g, b))
                
                # Coller sur le fond blanc en utilisant le canal alpha comme masque
                rgb_image.paste(rgb_temp, (0, 0), mask=a)
                pil_image = rgb_image
            
            # Sauvegarder en JPEG pour les PDFs (pas de transparence)
            img_buffer = io.BytesIO()
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            pil_image.save(img_buffer, format='JPEG', quality=95)
            img_buffer.seek(0)
            logo = Image(img_buffer, width=35*mm, height=35*mm, kind='proportional')
            
            # Positionner le logo en haut à droite
            logo.drawOn(canvas_obj, A4[0] - 50*mm, A4[1] - 40*mm)
            logo_loaded = True
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not load logo: {e}")
            logo_loaded = False
    
    # Nom de l'entreprise en haut à droite (uniquement si pas de logo)
    if company_name and not logo_loaded:
        canvas_obj.setFillColor(colors.HexColor('#0F172A'))
        canvas_obj.setFont("Helvetica-Bold", 14)
        canvas_obj.drawRightString(A4[0] - 20*mm, A4[1] - 25*mm, company_name)
    
    canvas_obj.restoreState()


def draw_footer_on_canvas(canvas_obj, doc, primary_color, footer_text=None):
    """Dessine le pied de page avec une petite bande diagonale et un texte personnalisé."""
    canvas_obj.saveState()
    
    # Petite bande diagonale en bas à droite
    # Utiliser le même ratio que le triangle du haut (largeur/hauteur ~1.56:1)
    triangle_width = 75*mm   # Largeur horizontale (augmentée par 3 : 25mm * 3 = 75mm)
    triangle_height = 16*mm   # Hauteur verticale
    canvas_obj.setFillColor(colors.HexColor(primary_color))
    canvas_obj.setStrokeColor(colors.HexColor(primary_color))
    path = canvas_obj.beginPath()
    path.moveTo(A4[0], 0)  # Coin inférieur droit
    path.lineTo(A4[0] - triangle_width, 0)  # Vers la gauche
    path.lineTo(A4[0], triangle_height)  # Vers le haut à droite
    path.close()
    canvas_obj.drawPath(path, fill=1, stroke=0)
    
    # Texte personnalisé du footer si fourni
    if footer_text and footer_text.strip():
        canvas_obj.setFillColor(colors.HexColor('#64748B'))
        canvas_obj.setFont("Helvetica", 8)
        # Positionner le texte au-dessus de la bande diagonale, centré sur toute la page
        text_y = triangle_height + 8*mm
        # Largeur disponible pour le texte (toute la page moins les marges)
        max_width = A4[0] - 40*mm  # Marges de 20mm de chaque côté
        text_x_start = 20*mm
        
        # Diviser le texte en plusieurs lignes si nécessaire
        words = footer_text.strip().split()
        lines = []
        current_line = []
        current_width = 0
        
        for word in words:
            word_width = canvas_obj.stringWidth(word + " ", "Helvetica", 8)
            if current_width + word_width <= max_width:
                current_line.append(word)
                current_width += word_width
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]
                current_width = word_width
        
        if current_line:
            lines.append(" ".join(current_line))
        
        # Dessiner les lignes centrées
        line_height = 10
        for i, line in enumerate(lines):
            line_width = canvas_obj.stringWidth(line, "Helvetica", 8)
            line_x = (A4[0] - line_width) / 2  # Centrer sur toute la largeur
            canvas_obj.drawString(line_x, text_y - i * line_height, line)
    
    canvas_obj.restoreState()


def generate_quote_pdf(
    quote: Quote,
    client: Client,
    company: Company,
    output_path: str,
    design_config: Optional[Dict[str, Any]] = None,
    client_signature_path: Optional[str] = None
) -> str:
    """
    Génère un PDF moderne pour un devis.
    
    Args:
        quote: Le devis à convertir en PDF
        client: Le client du devis
        company: L'entreprise qui émet le devis
        output_path: Chemin où sauvegarder le PDF
        design_config: Configuration du design (couleurs, logo)
    
    Returns:
        Le chemin du fichier PDF généré
    """
    # Configuration du design (valeurs par défaut si non fourni)
    if design_config is None:
        design_config = {}
    
    primary_color = design_config.get("primary_color", "#F97316")
    secondary_color = design_config.get("secondary_color", "#F0F0F0")
    logo_path = design_config.get("logo_path")
    footer_text = design_config.get("footer_text")
    terms_text = design_config.get("terms_text")
    signature_path = design_config.get("signature_path")
    
    # Si logo_path est relatif, le rendre absolu depuis UPLOAD_DIR
    if logo_path and not Path(logo_path).is_absolute():
        upload_dir = Path(settings.UPLOAD_DIR)
        logo_path = str(upload_dir / logo_path)
    
    # Créer le document PDF avec SimpleDocTemplate
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=90*mm,  # Plus d'espace pour la grande bande diagonale
        bottomMargin=30*mm
    )
    
    # Styles modernes
    styles = getSampleStyleSheet()
    
    # Style pour le titre "DEVIS" (grand, blanc, sur fond coloré)
    title_style = ParagraphStyle(
        'QuoteTitle',
        parent=styles['Heading1'],
        fontSize=48,
        textColor=colors.white,
        spaceAfter=0,
        spaceBefore=0,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold',
        leading=50
    )
    
    # Style pour les en-têtes de section
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    # Style normal
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        leading=14
    )
    
    # Style pour les informations importantes
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0F172A'),
        leading=14,
        fontName='Helvetica'
    )
    
    # Style pour les labels
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold',
        leading=14
    )
    
    # Contenu du PDF
    story = []
    
    # Le titre "DEVIS" est dessiné sur le canvas (dans draw_header_on_canvas)
    # Réduire l'espace pour monter "Facturé à:" plus haut
    story.append(Spacer(1, -15*mm))
    
    # Récupérer les coordonnées de l'entreprise
    company_info_data = {}
    try:
        from app.db.models.company_settings import CompanySettings
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == company.id
            ).first()
            if company_settings and company_settings.settings:
                company_info_data = company_settings.settings.get("company_info", {})
        finally:
            db.close()
    except Exception:
        pass
    
    # Construire les coordonnées de l'entreprise
    company_coords = []
    if company_info_data.get("address"):
        company_coords.append(company_info_data.get("address"))
    if company_info_data.get("city"):
        city_line = company_info_data.get("city")
        if company_info_data.get("postal_code"):
            city_line = f"{company_info_data.get('postal_code')} {city_line}"
        company_coords.append(city_line)
    if company_info_data.get("phone"):
        company_coords.append(f"Tél: {company_info_data.get('phone')}")
    if company_info_data.get("email"):
        company_coords.append(company_info_data.get("email"))
    
    # Construire les coordonnées du client avec toutes les données disponibles
    client_info = []
    if client.name:
        client_info.append(f"<b>{client.name}</b>")
    
    # Adresse complète : adresse, code postal, ville
    address_parts = []
    if hasattr(client, 'address') and client.address:
        address_parts.append(client.address)
    if hasattr(client, 'postal_code') and client.postal_code:
        address_parts.append(client.postal_code)
    if hasattr(client, 'city') and client.city:
        address_parts.append(client.city)
    if address_parts:
        client_info.append(" ".join(address_parts))
    
    # Email
    if client.email:
        client_info.append(client.email)
    
    # Téléphone
    if client.phone:
        client_info.append(f"Tél: {client.phone}")
    
    # Section avec coordonnées de l'entreprise à droite et coordonnées du client à gauche
    from reportlab.platypus import Table as TableElement
    
    # Colonne gauche : "Facturé à:" + coordonnées du client
    left_column_html = ""
    if client_info:
        left_column_html = "<b>Facturé à:</b><br/><br/>" + "<br/>".join(client_info)
    else:
        left_column_html = "<b>Facturé à:</b>"
    
    # Colonne droite : coordonnées de l'entreprise + "Devis #" + "Date"
    right_column_html = ""
    if company_coords:
        right_column_html = "<br/>".join(company_coords) + "<br/><br/>"
    right_column_html += f"<b>Devis #</b> {quote.number}<br/><b>Date</b> {quote.created_at.strftime('%d / %m / %Y') if quote.created_at else 'N/A'}"
    
    # Tableau pour aligner les deux colonnes
    header_table_data = [
        [
            Paragraph(left_column_html, info_style),
            Paragraph(
                right_column_html,
                ParagraphStyle(
                    'HeaderRight',
                    parent=styles['Normal'],
                    fontSize=10,
                    textColor=colors.HexColor('#64748B'),
                    alignment=TA_RIGHT,
                    leading=14
                )
            )
        ]
    ]
    
    header_table = TableElement(header_table_data, colWidths=[100*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12*mm))
    
    # Tableau des lignes avec design moderne
    table_data = [
        ['SL.', 'Description', 'Prix', 'Qté', 'Total']
    ]
    
    # Trier les lignes par order
    sorted_lines = sorted(quote.lines, key=lambda l: l.order if l.order is not None else 0)
    
    for idx, line in enumerate(sorted_lines, 1):
        table_data.append([
            str(idx),
            line.description or '',
            f"{line.unit_price_ht:.2f} €" if line.unit_price_ht else "0.00 €",
            str(line.quantity) if line.quantity else '0',
            f"{line.total_ttc:.2f} €" if line.total_ttc else "0.00 €"
        ])
    
    # Créer le tableau avec design moderne
    table = TableElement(table_data, colWidths=[12*mm, 95*mm, 30*mm, 20*mm, 33*mm], repeatRows=1)
    table.setStyle(TableStyle([
        # En-tête du tableau
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#E5E7EB')),
        
        # Corps du tableau
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#64748B')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # SL.
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),  # Description
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),  # Prix, Qté, Total
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 15*mm))
    
    # Message de remerciement
    thank_you_style = ParagraphStyle(
        'ThankYou',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold',
        spaceAfter=12,
        alignment=TA_CENTER
    )
    story.append(Paragraph("Merci pour votre confiance", thank_you_style))
    story.append(Spacer(1, 8*mm))
    
    # Section inférieure : Payment Info, Terms & Conditions à gauche, Totaux à droite
    # Construire le contenu de gauche comme un seul paragraphe
    # Récupérer les modalités de paiement depuis les settings
    payment_terms_text = None
    try:
        from app.db.models.company_settings import CompanySettings
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == company.id
            ).first()
            if company_settings and company_settings.settings:
                billing_settings = company_settings.settings.get("billing", {})
                payment_terms_text = billing_settings.get("payment_terms")
                
                # Si pas de modalités personnalisées, utiliser les infos bancaires de company_info
                if not payment_terms_text:
                    company_info = company_settings.settings.get("company_info", {})
                    payment_info_items = []
                    if company_info.get("iban"):
                        payment_info_items.append(f"<b>Compte #</b> {company_info.get('iban')}")
                    if company_info.get("bank_name"):
                        payment_info_items.append(f"<b>Banque</b> {company_info.get('bank_name')}")
                    if payment_info_items:
                        payment_terms_text = "<br/>".join(payment_info_items)
        finally:
            db.close()
    except Exception:
        pass
    
    # Construire le contenu de gauche
    left_content_html = f"<b>Informations de paiement</b><br/><br/>"
    if payment_terms_text:
        # Remplacer les retours à la ligne par <br/>
        # Limiter la longueur du texte pour éviter le débordement (environ 60 caractères par ligne)
        payment_terms_html = payment_terms_text.replace('\n', '<br/>').replace('\r', '')
        # Le wordWrap dans le style ParagraphStyle gérera automatiquement les retours à la ligne
        left_content_html += payment_terms_html
    else:
        left_content_html += "<b>Compte #</b> Ajoutez vos informations bancaires"
    
    # Ajouter mention TVA non applicable si applicable
    if company.vat_exempt and company.vat_exemption_reference:
        left_content_html += f"<br/><br/><b>TVA non applicable, {company.vat_exemption_reference}</b>"
    
    # Ajouter mentions légales obligatoires pour auto-entrepreneurs
    if company.is_auto_entrepreneur:
        left_content_html += f"<br/><br/><b>TVA non applicable, art. 293 B du CGI</b>"
    
    # Ajouter date de début de prestation si présente
    if quote.service_start_date:
        start_date_str = quote.service_start_date.strftime('%d / %m / %Y') if hasattr(quote.service_start_date, 'strftime') else str(quote.service_start_date)
        left_content_html += f"<br/><br/><b>Date de début de prestation:</b> {start_date_str}"
    
    # Ajouter durée/délai d'exécution si présent
    if quote.execution_duration:
        left_content_html += f"<br/><b>Durée d'exécution:</b> {quote.execution_duration}"
    
    # Créer un style pour limiter la largeur et éviter le débordement
    limited_style = ParagraphStyle(
        'LimitedPaymentInfo',
        parent=normal_style,
        leftIndent=0,
        rightIndent=0,
        wordWrap='CJK',  # Permet le retour à la ligne automatique
    )
    
    # Utiliser un Frame pour limiter la largeur du contenu
    from reportlab.platypus.frames import Frame
    from reportlab.platypus.doctemplate import PageTemplate
    
    left_content = Paragraph(left_content_html, limited_style)
    
    # Colonne droite : Totaux
    # Utiliser Paragraph pour toutes les lignes pour permettre le mélange de texte et HTML
    totals_data = [
        [Paragraph('Sous-total HT', normal_style), Paragraph(f"{quote.subtotal_ht:.2f} €" if quote.subtotal_ht else "0.00 €", normal_style)],
        [Paragraph('TVA', normal_style), Paragraph(f"{quote.total_tax:.2f} €" if quote.total_tax else "0.00 €", normal_style)],
    ]
    
    # Ajouter la réduction si présente
    if quote.discount_type and quote.discount_value:
        # Calculer le total TTC avant réduction pour l'affichage (convertir en Decimal)
        total_ttc_before_discount = sum(Decimal(str(line.total_ttc)) for line in quote.lines) if quote.lines else Decimal("0")
        
        discount_label = quote.discount_label or "Réduction"
        if quote.discount_type == "percentage":
            discount_amount = (total_ttc_before_discount * Decimal(str(quote.discount_value))) / Decimal("100")
            # Arrondir le montant de la réduction à 2 décimales
            discount_amount = discount_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            discount_display = f"{discount_label} ({quote.discount_value:.2f}%)"
        else:  # fixed
            discount_amount = Decimal(str(quote.discount_value))
            discount_display = discount_label
        
        totals_data.append([Paragraph('', normal_style), Paragraph('', normal_style)])  # Ligne vide
        # Utiliser Paragraph pour interpréter les balises HTML
        discount_label_para = Paragraph(f"<i>{discount_display}</i>", normal_style)
        discount_amount_para = Paragraph(f"<i>-{discount_amount:.2f} €</i>", normal_style)
        totals_data.append([discount_label_para, discount_amount_para])
    
    # Utiliser Paragraph pour le Total afin d'interpréter les balises HTML
    total_label_para = Paragraph('<b>Total</b>', ParagraphStyle(
        'TotalLabel',
        parent=normal_style,
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0F172A')
    ))
    total_amount_para = Paragraph(
        f"<b>{quote.total_ttc:.2f} €</b>" if quote.total_ttc else "<b>0.00 €</b>",
        ParagraphStyle(
            'TotalAmount',
            parent=normal_style,
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0F172A')
        )
    )
    totals_data.append([total_label_para, total_amount_para])
    
    # Ajouter mention "Devis valable jusqu'au..." si valid_until existe
    if quote.valid_until:
        valid_until_str = quote.valid_until.strftime('%d / %m / %Y') if hasattr(quote.valid_until, 'strftime') else str(quote.valid_until)
        totals_data.append([Paragraph('', normal_style), Paragraph('', normal_style)])  # Ligne vide
        valid_until_label_para = Paragraph('<i>Devis valable jusqu\'au</i>', normal_style)
        valid_until_value_para = Paragraph(f"<i>{valid_until_str}</i>", normal_style)
        totals_data.append([valid_until_label_para, valid_until_value_para])
    
    totals_table = TableElement(totals_data, colWidths=[60*mm, 50*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#64748B')),
        ('LINEABOVE', (-1, -1), (-1, -1), 2, colors.HexColor(primary_color)),  # Ligne au-dessus du total
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    # Créer un tableau pour aligner les deux colonnes
    footer_table_data = [
        [left_content, totals_table]
    ]
    
    # Réduire la largeur de la colonne gauche pour éviter le débordement sur les totaux
    footer_table = TableElement(footer_table_data, colWidths=[90*mm, 90*mm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),  # Pas de padding gauche pour éviter le débordement
        ('RIGHTPADDING', (0, 0), (0, 0), 5*mm),  # Petit padding droit pour séparer des totaux
        ('TOPPADDING', (0, 0), (0, 0), 0),
        ('BOTTOMPADDING', (0, 0), (0, 0), 0),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 0),
    ]))
    
    story.append(footer_table)
    
    # Notes si présentes
    if quote.notes:
        story.append(Spacer(1, 10*mm))
        story.append(Paragraph("Notes", heading_style))
        story.append(Paragraph(quote.notes.replace('\n', '<br/>'), normal_style))
    
    # Conditions Générales de Vente si présentes
    if terms_text and terms_text.strip():
        story.append(Spacer(1, 15*mm))
        # Titre des CGV
        cgv_title_style = ParagraphStyle(
            'CGVTitle',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=8,
            spaceBefore=0,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph("Conditions Générales de Vente", cgv_title_style))
        
        # Style pour le contenu des CGV
        cgv_style = ParagraphStyle(
            'CGVContent',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748B'),
            leading=12,
            spaceAfter=6
        )
        
        # Diviser le texte en lignes et créer des paragraphes
        cgv_lines = terms_text.strip().split('\n')
        for line in cgv_lines:
            if line.strip():
                # Remplacer les retours à la ligne dans le texte
                formatted_line = line.strip().replace('\n', '<br/>')
                story.append(Paragraph(formatted_line, cgv_style))
    
    # Mentions légales obligatoires pour auto-entrepreneurs (avant la mention de contrat)
    if company.is_auto_entrepreneur:
        story.append(Spacer(1, 10*mm))
        legal_mention_style = ParagraphStyle(
            'LegalMention',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748B'),
            alignment=TA_LEFT,
            spaceAfter=6,
            leftIndent=0
        )
        story.append(Paragraph("<b>Mentions légales (Entrepreneur Individuel) :</b>", legal_mention_style))
        story.append(Paragraph("TVA non applicable, art. 293 B du CGI", legal_mention_style))
        # Note: SIRET et numéro d'inscription RM/RCS peuvent être ajoutés si disponibles dans les settings de l'entreprise
        story.append(Spacer(1, 6*mm))
    
    # Mention "Devis faisant office de contrat après signature"
    story.append(Spacer(1, 10*mm))
    contract_mention_style = ParagraphStyle(
        'ContractMention',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=12
    )
    story.append(Paragraph("Devis faisant office de contrat après signature", contract_mention_style))
    
    # Zone "Bon pour accord" avant les signatures - UNIQUEMENT si le client a signé électroniquement
    if client_signature_path:
        story.append(Spacer(1, 10*mm))
        approval_zone_style = ParagraphStyle(
            'ApprovalZone',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#0F172A'),
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            spaceAfter=20
        )
        story.append(Paragraph("Bon pour accord", approval_zone_style))
    
    # Section signatures (entreprise et client)
    story.append(Spacer(1, 10*mm))
    
    # Préparer le chemin de la signature si disponible
    signature_image_path = None
    if signature_path:
        if not Path(signature_path).is_absolute():
            upload_dir = Path(settings.UPLOAD_DIR)
            signature_image_path = str(upload_dir / signature_path)
        else:
            signature_image_path = signature_path
    
    # Colonne gauche : Signature entreprise
    left_signature_elements = []
    if signature_image_path and Path(signature_image_path).exists():
        try:
            signature_img = Image(signature_image_path, width=70*mm, height=25*mm, kind='proportional')
            left_signature_elements.append(signature_img)
            left_signature_elements.append(Spacer(1, 3*mm))
        except Exception:
            pass
    
    # Label signature entreprise
    left_signature_style = ParagraphStyle(
        'SignatureLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_LEFT
    )
    left_signature_elements.append(Paragraph("Signature de l'entreprise", left_signature_style))
    
    # Colonne droite : Signature client (électronique ou espace vide)
    right_signature_elements = []
    
    # Utiliser la signature du client si fournie, sinon espace vide
    if client_signature_path:
        # Chemin absolu pour la signature du client
        if not Path(client_signature_path).is_absolute():
            upload_dir = Path(settings.UPLOAD_DIR)
            client_sig_path = str(upload_dir / client_signature_path)
        else:
            client_sig_path = client_signature_path
        
        if Path(client_sig_path).exists():
            try:
                client_signature_img = Image(client_sig_path, width=70*mm, height=25*mm, kind='proportional')
                right_signature_elements.append(client_signature_img)
                right_signature_elements.append(Spacer(1, 3*mm))
            except Exception:
                # Si erreur, utiliser l'espace vide
                right_signature_elements.append(Spacer(1, 20*mm))
        else:
            right_signature_elements.append(Spacer(1, 20*mm))
    else:
        # Espace vide pour signature manuelle
        right_signature_elements.append(Spacer(1, 20*mm))
    
    right_signature_style = ParagraphStyle(
        'SignatureLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_RIGHT
    )
    right_signature_elements.append(Paragraph("Signature du client", right_signature_style))
    
    # Créer un tableau avec les deux colonnes (sans KeepTogether pour éviter les problèmes de taille)
    signature_table = TableElement([
        [
            left_signature_elements,
            right_signature_elements
        ]
    ], colWidths=[100*mm, 80*mm])
    
    signature_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(signature_table)
    
    # Fonctions pour dessiner l'en-tête et le pied de page
    def on_first_page(canvas_obj, doc):
        draw_header_on_canvas(canvas_obj, doc, primary_color, secondary_color, logo_path, company.name if company else None)
        draw_footer_on_canvas(canvas_obj, doc, primary_color, footer_text)
    
    def on_later_pages(canvas_obj, doc):
        draw_header_on_canvas(canvas_obj, doc, primary_color, secondary_color, logo_path, company.name if company else None)
        draw_footer_on_canvas(canvas_obj, doc, primary_color, footer_text)
    
    # Générer le PDF avec les callbacks pour l'en-tête et le pied de page
    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    
    return output_path
