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
    
    # Logo si disponible (en haut à droite) - DESSINER EN PREMIER pour être au-dessus
    logo_loaded = False
    logo_image = None
    if logo_path:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[LOGO] Original logo_path from config: {logo_path}")
        
        # Normaliser le chemin : enlever le préfixe "uploads" s'il existe déjà
        normalized_path = logo_path
        if normalized_path.startswith("uploads/"):
            normalized_path = normalized_path[8:]  # Enlever "uploads/"
            logger.info(f"[LOGO] Removed 'uploads/' prefix, normalized: {normalized_path}")
        elif normalized_path.startswith("./uploads/"):
            normalized_path = normalized_path[11:]  # Enlever "./uploads/"
            logger.info(f"[LOGO] Removed './uploads/' prefix, normalized: {normalized_path}")
        
        # Si logo_path est relatif, le rendre absolu depuis UPLOAD_DIR
        from app.core.config import settings
        upload_dir = Path(settings.UPLOAD_DIR).resolve()  # Utiliser resolve() pour obtenir le chemin absolu
        
        # Toujours construire le chemin absolu pour vérifier l'existence locale
        if not Path(normalized_path).is_absolute():
            logo_path_absolute = upload_dir / normalized_path
            logo_path = str(logo_path_absolute.resolve())  # Resolve pour normaliser le chemin
            logger.info(f"[LOGO] UPLOAD_DIR: {upload_dir}, normalized_path: {normalized_path}, final path: {logo_path}")
        else:
            # Si c'est déjà absolu, extraire le chemin relatif pour Supabase
            try:
                # Essayer d'extraire le chemin relatif depuis UPLOAD_DIR
                logo_path_obj = Path(logo_path)
                if logo_path_obj.is_relative_to(upload_dir):
                    normalized_path = str(logo_path_obj.relative_to(upload_dir))
                else:
                    # Si ce n'est pas relatif à UPLOAD_DIR, utiliser le nom du fichier
                    normalized_path = logo_path_obj.name
            except (ValueError, AttributeError):
                # Si Python < 3.9, utiliser une méthode alternative
                normalized_path = str(Path(logo_path).name)
            logo_path = str(Path(logo_path).resolve())
            logger.info(f"[LOGO] Path already absolute, resolved: {logo_path}, normalized for Supabase: {normalized_path}")
        
        logo_path_obj = Path(logo_path)
        logger.info(f"[LOGO] Checking if file exists: {logo_path_obj} (exists: {logo_path_obj.exists()})")
        
        # Essayer de charger depuis le système de fichiers local
        if logo_path_obj.exists():
            try:
                logo_image = Image(logo_path, width=35*mm, height=35*mm, kind='proportional')
                logo_loaded = True
                logger.info(f"[LOGO] Logo loaded successfully from local filesystem: {logo_path}")
            except Exception as e:
                logger.warning(f"Could not load logo from local filesystem: {e}")
                logo_loaded = False
        
        # Si le fichier n'existe pas localement, essayer Supabase Storage
        if not logo_loaded and normalized_path:
            try:
                from app.core.supabase_storage_service import download_file as download_from_supabase, is_supabase_storage_configured
                import io
                
                if is_supabase_storage_configured():
                    logger.info(f"[LOGO] Trying to download from Supabase Storage: {normalized_path}")
                    file_content = download_from_supabase(normalized_path)
                    if file_content:
                        logger.info(f"[LOGO] Downloaded {len(file_content)} bytes from Supabase")
                        # Sauvegarder temporairement le fichier pour ReportLab
                        # ReportLab a parfois des problèmes avec BytesIO, donc on sauvegarde temporairement
                        import tempfile
                        import os
                        import uuid
                        temp_logo_path = None
                        try:
                            # Créer un fichier temporaire dans le répertoire d'upload pour qu'il persiste pendant la génération du PDF
                            # Extraire company_id du normalized_path (format: "company_id/filename")
                            company_id_from_path = normalized_path.split("/")[0] if "/" in normalized_path else "temp"
                            temp_dir = upload_dir / company_id_from_path / "temp_logos"
                            temp_dir.mkdir(parents=True, exist_ok=True)
                            temp_logo_path = temp_dir / f"logo_{uuid.uuid4().hex[:8]}.png"
                            
                            with open(temp_logo_path, "wb") as temp_file:
                                temp_file.write(file_content)
                            
                            logger.info(f"[LOGO] Saved temporary logo file: {temp_logo_path}")
                            logo_image = Image(str(temp_logo_path), width=35*mm, height=35*mm, kind='proportional')
                            logo_loaded = True
                            logger.info(f"[LOGO] Image object created successfully from Supabase Storage: {normalized_path}")
                            
                            # Le fichier temporaire sera nettoyé après la génération complète du PDF
                            # On ne le supprime pas immédiatement car ReportLab peut en avoir besoin
                        except Exception as img_error:
                            logger.error(f"[LOGO] Error creating image from Supabase bytes: {img_error}", exc_info=True)
                            logo_loaded = False
                            # Nettoyer le fichier temporaire en cas d'erreur
                            if temp_logo_path and os.path.exists(temp_logo_path):
                                try:
                                    os.unlink(temp_logo_path)
                                except:
                                    pass
                    else:
                        logger.warning(f"[LOGO] No file content received from Supabase Storage for: {normalized_path}")
            except Exception as e:
                logger.error(f"Could not load logo from Supabase Storage: {e}", exc_info=True)
        
        # Dernier recours : essayer le chemin alternatif
        if not logo_loaded and normalized_path and not Path(normalized_path).is_absolute():
            alt_path = upload_dir / normalized_path
            alt_path_resolved = alt_path.resolve()
            logger.info(f"[LOGO] Trying alternative path: {alt_path_resolved} (exists: {alt_path_resolved.exists()})")
            if alt_path_resolved.exists():
                try:
                    logo_image = Image(str(alt_path_resolved), width=35*mm, height=35*mm, kind='proportional')
                    logo_loaded = True
                    logger.info(f"[LOGO] Logo loaded from alternative path: {alt_path_resolved}")
                except Exception as e:
                    logger.warning(f"Could not load logo from alternative path: {e}")
        
        if not logo_loaded:
            logger.warning(f"Logo file not found: {logo_path} (tried local filesystem, Supabase Storage, and alternative paths)")
    
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
    
    # Dessiner le logo maintenant (après la bande et le texte, pour être au-dessus)
    if logo_loaded and logo_image:
        try:
            # Position du logo : en haut à droite, mais plus bas pour éviter la bande diagonale
            # La bande diagonale va jusqu'à environ 30mm depuis le haut
            # Le logo doit être en dessous de la bande mais toujours en haut à droite
            # Ajuster la position pour qu'il soit visible (la marge supérieure est de 90mm)
            logo_x = A4[0] - 50*mm  # 50mm depuis le bord droit (environ 145mm depuis la gauche)
            logo_y = A4[1] - 45*mm  # 45mm depuis le haut pour être visible et en dessous de la bande diagonale
            logger.info(f"[LOGO] Drawing logo at position ({logo_x}, {logo_y}), size: {35*mm}x{35*mm}")
            logger.info(f"[LOGO] A4 dimensions: width={A4[0]}, height={A4[1]}")
            logger.info(f"[LOGO] Logo will be drawn at: x={logo_x} (from left), y={logo_y} (from bottom)")
            
            # S'assurer que le logo est dessiné après tous les autres éléments
            # En ReportLab, l'ordre de dessin détermine ce qui est au-dessus
            # On dessine le logo en dernier pour qu'il soit visible
            canvas_obj.saveState()
            logo_image.drawOn(canvas_obj, logo_x, logo_y)
            canvas_obj.restoreState()
            logger.info(f"[LOGO] ✅ Logo drawn successfully on canvas at ({logo_x}, {logo_y})")
        except Exception as draw_error:
            logger.error(f"[LOGO] ❌ Error drawing logo on canvas: {draw_error}", exc_info=True)
            import traceback
            logger.error(f"[LOGO] Traceback: {traceback.format_exc()}")
    
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
    logo_path = design_config.get("logo_path")  # Passer le chemin original à draw_header_on_canvas
    footer_text = design_config.get("footer_text")
    terms_text = design_config.get("terms_text")
    signature_path = design_config.get("signature_path")  # Passer le chemin original
    
    # Log pour debug
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[QUOTE PDF] logo_path from design_config: {logo_path}")
    
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
        # Formater la quantité avec l'unité si disponible
        quantity_display = str(line.quantity) if line.quantity else '0'
        if line.unit:
            quantity_display = f"{quantity_display} {line.unit}"
        
        table_data.append([
            str(idx),
            line.description or '',
            f"{line.unit_price_ht:.2f} €" if line.unit_price_ht else "0.00 €",
            quantity_display,
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
    ]
    
    # Calculer le détail de la TVA par taux
    # Grouper les lignes par taux de TVA et calculer le total HT et TVA pour chaque taux
    tax_details = {}  # {tax_rate: {'subtotal_ht': Decimal, 'tax_amount': Decimal}}
    for line in sorted_lines:
        tax_rate = Decimal(str(line.tax_rate)) if line.tax_rate else Decimal('0')
        if tax_rate not in tax_details:
            tax_details[tax_rate] = {'subtotal_ht': Decimal('0'), 'tax_amount': Decimal('0')}
        tax_details[tax_rate]['subtotal_ht'] += Decimal(str(line.subtotal_ht))
        tax_details[tax_rate]['tax_amount'] += Decimal(str(line.tax_amount))
    
    # Afficher le détail de la TVA par taux (trié par taux décroissant)
    if tax_details:
        # Si un seul taux de TVA, afficher simplement "TVA"
        if len(tax_details) == 1:
            tax_rate = list(tax_details.keys())[0]
            if tax_rate > 0:
                totals_data.append([
                    Paragraph('TVA', normal_style),
                    Paragraph(f"{quote.total_tax:.2f} €" if quote.total_tax else "0.00 €", normal_style)
                ])
        else:
            # Plusieurs taux de TVA : afficher le détail
            for tax_rate in sorted(tax_details.keys(), reverse=True):
                if tax_rate > 0:
                    tax_info = tax_details[tax_rate]
                    tax_label = f"TVA {tax_rate:.2f}%"
                    # Enlever les zéros inutiles (ex: 20.00% -> 20%)
                    if tax_rate == int(tax_rate):
                        tax_label = f"TVA {int(tax_rate)}%"
                    totals_data.append([
                        Paragraph(tax_label, normal_style),
                        Paragraph(f"{tax_info['tax_amount']:.2f} €", normal_style)
                    ])
    else:
        # Aucune TVA (toutes les lignes à 0%)
        if quote.total_tax and quote.total_tax > 0:
            totals_data.append([
                Paragraph('TVA', normal_style),
                Paragraph(f"{quote.total_tax:.2f} €", normal_style)
            ])
    
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
    
    # Section signatures (entreprise et client)
    story.append(Spacer(1, 10*mm))
    
    # Colonne gauche : Signature entreprise
    left_signature_elements = []
    if signature_path:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[QUOTE PDF] Original signature_path: {signature_path}")
        
        # Normaliser le chemin
        normalized_sig_path = signature_path
        if normalized_sig_path.startswith("uploads/"):
            normalized_sig_path = normalized_sig_path[8:]
        elif normalized_sig_path.startswith("./uploads/"):
            normalized_sig_path = normalized_sig_path[11:]
        
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        if not Path(normalized_sig_path).is_absolute():
            signature_image_path = str((upload_dir / normalized_sig_path).resolve())
        else:
            signature_image_path = str(Path(normalized_sig_path).resolve())
        
        logger.info(f"[QUOTE PDF] Normalized signature_path: {signature_image_path}")
        
        # Essayer de charger depuis le système de fichiers local
        signature_loaded = False
        if Path(signature_image_path).exists():
            try:
                signature_img = Image(signature_image_path, width=70*mm, height=25*mm, kind='proportional')
                left_signature_elements.append(signature_img)
                left_signature_elements.append(Spacer(1, 3*mm))
                signature_loaded = True
                logger.info(f"[QUOTE PDF] Signature loaded from local filesystem: {signature_image_path}")
            except Exception as e:
                logger.warning(f"Could not load signature from local filesystem: {e}")
        
        # Si le fichier n'existe pas localement, essayer Supabase Storage
        if not signature_loaded:
            try:
                from app.core.supabase_storage_service import download_file as download_from_supabase, is_supabase_storage_configured
                import io
                
                if is_supabase_storage_configured():
                    logger.info(f"[QUOTE PDF] Trying to download signature from Supabase Storage: {normalized_sig_path}")
                    file_content = download_from_supabase(normalized_sig_path)
                    if file_content:
                        signature_bytes = io.BytesIO(file_content)
                        signature_img = Image(signature_bytes, width=70*mm, height=25*mm, kind='proportional')
                        left_signature_elements.append(signature_img)
                        left_signature_elements.append(Spacer(1, 3*mm))
                        signature_loaded = True
                        logger.info(f"[QUOTE PDF] Signature loaded from Supabase Storage: {normalized_sig_path}")
            except Exception as e:
                logger.warning(f"Could not load signature from Supabase Storage: {e}")
        
        if not signature_loaded:
            logger.warning(f"[QUOTE PDF] Signature file not found: {signature_image_path}")
    
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
    
    # Zone "Bon pour accord" juste au-dessus de la signature du client - UNIQUEMENT si le client a signé électroniquement
    if client_signature_path:
        approval_zone_style = ParagraphStyle(
            'ApprovalZone',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#0F172A'),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT,
            spaceAfter=8
        )
        right_signature_elements.append(Paragraph("Bon pour accord", approval_zone_style))
    
    # Utiliser la signature du client si fournie, sinon espace vide
    if client_signature_path:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[QUOTE PDF] Original client_signature_path: {client_signature_path}")
        
        # Normaliser le chemin : enlever le préfixe "uploads" s'il existe déjà
        normalized_client_path = client_signature_path
        if normalized_client_path.startswith("uploads/"):
            normalized_client_path = normalized_client_path[8:]  # Enlever "uploads/"
        elif normalized_client_path.startswith("./uploads/"):
            normalized_client_path = normalized_client_path[11:]  # Enlever "./uploads/"
        
        # Chemin absolu pour la signature du client
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        if not Path(normalized_client_path).is_absolute():
            client_sig_path = str((upload_dir / normalized_client_path).resolve())
        else:
            client_sig_path = str(Path(normalized_client_path).resolve())
        
        logger.info(f"[QUOTE PDF] Normalized client_signature_path: {client_sig_path}")
        
        # Essayer de charger depuis le système de fichiers local
        client_sig_loaded = False
        if Path(client_sig_path).exists():
            try:
                client_signature_img = Image(client_sig_path, width=70*mm, height=25*mm, kind='proportional')
                right_signature_elements.append(client_signature_img)
                client_sig_loaded = True
                logger.info(f"[QUOTE PDF] Client signature loaded from local filesystem: {client_sig_path}")
            except Exception as e:
                logger.warning(f"Could not load client signature from local filesystem: {e}")
        
        # Si le fichier n'existe pas localement, essayer Supabase Storage
        if not client_sig_loaded:
            try:
                from app.core.supabase_storage_service import download_file as download_from_supabase, is_supabase_storage_configured
                import io
                
                if is_supabase_storage_configured():
                    logger.info(f"[QUOTE PDF] Trying to download client signature from Supabase Storage: {normalized_client_path}")
                    try:
                        file_content = download_from_supabase(normalized_client_path)
                        if file_content:
                            logger.info(f"[QUOTE PDF] Downloaded {len(file_content)} bytes for client signature from Supabase")
                            client_sig_bytes = io.BytesIO(file_content)
                            client_sig_bytes.seek(0)  # S'assurer que le pointeur est au début
                            client_signature_img = Image(client_sig_bytes, width=70*mm, height=25*mm, kind='proportional')
                            right_signature_elements.append(client_signature_img)
                            client_sig_loaded = True
                            logger.info(f"[QUOTE PDF] Client signature loaded from Supabase Storage: {normalized_client_path}")
                        else:
                            logger.warning(f"[QUOTE PDF] No file content received from Supabase for client signature: {normalized_client_path}")
                    except Exception as download_error:
                        logger.error(f"[QUOTE PDF] Error downloading client signature from Supabase: {download_error}", exc_info=True)
                        # L'erreur 400 peut signifier que le fichier n'existe pas ou que le chemin est incorrect
                        # C'est normal si la signature n'a pas encore été sauvegardée dans Supabase
            except Exception as e:
                logger.warning(f"Could not load client signature from Supabase Storage: {e}", exc_info=True)
        
        if not client_sig_loaded:
            logger.warning(f"[QUOTE PDF] Client signature file not found: {client_sig_path}")
            # Espace vide si signature non trouvée
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
