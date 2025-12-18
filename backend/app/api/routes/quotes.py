from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
import logging
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP

from app.db.session import get_db
from app.db.models.billing import Quote, QuoteLine, QuoteStatus, Invoice, InvoiceLine, InvoiceStatus, InvoiceType, QuoteSignature, QuoteSignatureAuditLog
from app.db.models.quote_otp import QuoteOTP
from app.db.models.project import Project
from app.db.models.client import Client
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.api.schemas.quote import (
    QuoteCreate, QuoteUpdate, QuoteRead, QuoteLineCreate
)
from app.api.schemas.invoice import InvoiceRead
from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.core.invoice_service import (
    calculate_line_totals, validate_tax_rate, get_valid_tax_rates,
    generate_invoice_number, recalculate_invoice_totals, validate_invoice_totals
)
from app.core.quote_pdf_service import generate_quote_pdf
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment
from app.db.models.inbox_integration import InboxIntegration
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.config import settings
from pathlib import Path
import shutil
import os
import uuid
import base64
import hashlib
import json
import secrets

router = APIRouter(prefix="/quotes", tags=["quotes"])
logger = logging.getLogger(__name__)


def get_company_info(db: Session, company_id: int) -> Optional[Company]:
    """Récupère les informations de l'entreprise."""
    return db.query(Company).filter(Company.id == company_id).first()


def get_client_info(db: Session, client_id: int, company_id: int) -> Optional[Client]:
    """Récupère les informations du client."""
    return db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == company_id
    ).first()


def generate_quote_number(db: Session, company_id: int) -> str:
    """Génère un numéro de devis séquentiel (ex: DEV-2025-001)."""
    current_year = datetime.now().year
    
    # Trouver le dernier numéro de devis pour cette entreprise et cette année
    last_quote = db.query(Quote).filter(
        Quote.company_id == company_id,
        Quote.number.like(f"DEV-{current_year}-%")
    ).order_by(Quote.number.desc()).first()
    
    if last_quote:
        # Extraire le numéro séquentiel
        try:
            last_number = int(last_quote.number.split("-")[-1])
            next_number = last_number + 1
        except (ValueError, IndexError):
            next_number = 1
    else:
        next_number = 1
    
    return f"DEV-{current_year}-{next_number:03d}"


def create_automatic_followup_for_quote(db: Session, quote: Quote, user_id: int):
    """
    Crée automatiquement une relance pour un devis envoyé.
    Vérifie d'abord si les relances automatiques sont activées dans les settings.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Vérifier si les relances automatiques sont activées
        from app.db.models.company_settings import CompanySettings
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == quote.company_id
        ).first()
        
        # Vérifier si les relances automatiques pour les devis sont activées
        should_create = True
        if company_settings and company_settings.settings:
            # Vérifier d'abord si le module relances est activé
            modules = company_settings.settings.get("modules", {})
            relances_module = modules.get("relances", {})
            if relances_module.get("enabled") is False:
                should_create = False
                logger.info(f"[FOLLOWUP AUTO] Relances automatiques désactivées (module relances désactivé)")
            else:
                # Si le module est activé, vérifier le paramètre spécifique pour les devis
                billing_settings = company_settings.settings.get("billing", {})
                auto_followups = billing_settings.get("auto_followups", {})
                quotes_enabled = auto_followups.get("quotes_enabled")
                if quotes_enabled is False:
                    should_create = False
                    logger.info(f"[FOLLOWUP AUTO] Relances automatiques pour les devis désactivées (paramètre billing.auto_followups.quotes_enabled = False)")
        
        if not should_create:
            return
        
        # Vérifier si une relance existe déjà pour ce devis
        from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus
        existing_followup = db.query(FollowUp).filter(
            FollowUp.source_type == "quote",
            FollowUp.source_id == quote.id,
            FollowUp.type == FollowUpType.DEVIS_NON_REPONDU
        ).first()
        
        if existing_followup:
            logger.info(f"[FOLLOWUP AUTO] Relance déjà existante pour le devis {quote.number} (ID: {quote.id})")
            return
        
        initial_delay_days = 7  # Valeur par défaut
        if company_settings and company_settings.settings:
            followup_settings = company_settings.settings.get("followups", {})
            relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
            if relance_delays and len(relance_delays) > 0:
                initial_delay_days = relance_delays[0]
            else:
                initial_delay_days = followup_settings.get("initial_delay_days", 7)
        
        # Calculer la date due (dans X jours)
        due_date = datetime.now(timezone.utc) + timedelta(days=initial_delay_days)
        
        # Créer la relance automatique
        followup = FollowUp(
            company_id=quote.company_id,
            client_id=quote.client_id,
            type=FollowUpType.DEVIS_NON_REPONDU,
            source_type="quote",
            source_id=quote.id,
            source_label=f"Devis {quote.number}",
            due_date=due_date,
            actual_date=due_date,
            status=FollowUpStatus.A_FAIRE,
            amount=quote.total_ttc or quote.amount,
            auto_enabled=True,
            auto_frequency_days=initial_delay_days,
            auto_stop_on_response=True,
            auto_stop_on_paid=True,
            auto_stop_on_refused=True,
            created_by_id=user_id
        )
        
        db.add(followup)
        db.commit()
        logger.info(f"[FOLLOWUP AUTO] ✅ Relance automatique créée pour le devis {quote.number} (ID: {quote.id}) - Due: {due_date.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        logger.error(f"[FOLLOWUP AUTO] ❌ Erreur lors de la création de la relance automatique pour le devis {quote.id}: {e}", exc_info=True)
        # Ne pas faire échouer la création du devis si la relance échoue


def recalculate_quote_totals(quote: Quote) -> None:
    """Recalcule les totaux du devis à partir de ses lignes, en appliquant la réduction si présente."""
    if not quote.lines:
        quote.subtotal_ht = Decimal("0")
        quote.total_tax = Decimal("0")
        quote.total_ttc = Decimal("0")
        quote.amount = Decimal("0")
        return
    
    # Convertir en Decimal pour éviter les problèmes de types SQLAlchemy Numeric
    subtotal_ht = sum(Decimal(str(line.subtotal_ht)) for line in quote.lines)
    total_tax = sum(Decimal(str(line.tax_amount)) for line in quote.lines)
    total_ttc_before_discount = sum(Decimal(str(line.total_ttc)) for line in quote.lines)
    
    # Appliquer la réduction si présente
    discount_amount = Decimal("0")
    if quote.discount_type and quote.discount_value is not None:
        if quote.discount_type == "percentage":
            # Réduction en pourcentage sur le total TTC
            discount_amount = (total_ttc_before_discount * Decimal(str(quote.discount_value))) / Decimal("100")
            # Arrondir la réduction à 2 décimales
            discount_amount = discount_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif quote.discount_type == "fixed":
            # Réduction en montant fixe
            discount_amount = Decimal(str(quote.discount_value))
    
    # Calculer le total TTC après réduction
    total_ttc_after_discount = total_ttc_before_discount - discount_amount
    if total_ttc_after_discount < 0:
        total_ttc_after_discount = Decimal("0")
    
    # Arrondir les totaux à 2 décimales
    quote.subtotal_ht = subtotal_ht.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    quote.total_tax = total_tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    quote.total_ttc = total_ttc_after_discount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    quote.amount = quote.total_ttc  # Pour compatibilité


@router.get("", response_model=List[QuoteRead])
def get_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status_filter"),
    client_id: Optional[int] = Query(None, alias="client_id"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère la liste des devis de l'entreprise.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    query = db.query(Quote).filter(
        Quote.company_id == current_user.company_id
    )
    
    # Filtre par statut
    if status_filter:
        try:
            status_enum = QuoteStatus(status_filter)
            query = query.filter(Quote.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Filtre par client
    if client_id:
        query = query.filter(Quote.client_id == client_id)
    
    # Recherche par numéro
    if search:
        search_term = f"%{search}%"
        query = query.filter(Quote.number.ilike(search_term))
    
    # Pagination
    quotes = query.order_by(Quote.created_at.desc()).offset(skip).limit(limit).all()
    
    # Ajouter les noms de client et projet
    for quote in quotes:
        client = db.query(Client).filter(Client.id == quote.client_id).first()
        if client:
            quote.client_name = client.name
        quote.client_email = client.email  # Ajouter l'email du client
        if quote.project_id:
            project = db.query(Project).filter(Project.id == quote.project_id).first()
            if project:
                quote.project_name = project.name
    
    return quotes


@router.get("/preview", response_class=FileResponse)
def preview_quote_design(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Génère un aperçu du modèle de devis avec les paramètres de design actuels.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer l'entreprise et un client de test
    company = get_company_info(db, current_user.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Créer des objets simples pour la démonstration (pas des objets SQLAlchemy)
    # On utilise des classes simples qui ont juste les attributs nécessaires pour le PDF
    from datetime import datetime, timezone
    from types import SimpleNamespace
    
    # Client de démonstration
    demo_client = SimpleNamespace(
        id=0,
        company_id=current_user.company_id,
        name="Client Exemple",
        email="client@exemple.fr",
        phone="01 23 45 67 89",
        address=None
    )
    
    # Lignes de démonstration
    demo_line1 = SimpleNamespace(
        id=0,
        quote_id=0,
        description="Prestation de service exemple",
        quantity=Decimal("2"),
        unit_price_ht=Decimal("50.00"),
        tax_rate=Decimal("20.00"),
        subtotal_ht=Decimal("100.00"),
        tax_amount=Decimal("20.00"),
        total_ttc=Decimal("120.00"),
        order=0
    )
    
    # Devis de démonstration
    demo_quote = SimpleNamespace(
        id=0,
        company_id=current_user.company_id,
        client_id=0,
        number="DEV-2025-EXEMPLE",
        status=QuoteStatus.ENVOYE,
        created_at=datetime.now(timezone.utc),
        subtotal_ht=Decimal("100.00"),
        total_tax=Decimal("20.00"),
        total_ttc=Decimal("120.00"),
        amount=Decimal("120.00"),
        notes="Ceci est un exemple de devis avec votre design personnalisé.",
        conditions="Conditions de paiement : 30 jours net.",
        valid_until=None,  # Durée de validité du devis
        service_start_date=None,  # Date de début de prestation
        execution_duration=None,  # Durée ou délai d'exécution
        lines=[demo_line1]
    )
    
    # Récupérer la configuration du design depuis les settings
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    design_config = {}
    if company_settings_obj and company_settings_obj.settings:
        billing_design = company_settings_obj.settings.get("billing", {}).get("quote_design", {})
        design_config = {
            "primary_color": billing_design.get("primary_color", "#F97316"),
            "secondary_color": billing_design.get("secondary_color", "#F0F0F0"),
            "logo_path": billing_design.get("logo_path"),
            "signature_path": billing_design.get("signature_path"),
            "footer_text": billing_design.get("footer_text"),
            "terms_text": billing_design.get("terms_text")
        }
    
    # Générer le PDF d'aperçu
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    preview_dir = upload_dir / str(current_user.company_id) / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_filename = f"preview_{uuid.uuid4().hex[:8]}.pdf"
    pdf_path = preview_dir / pdf_filename
    
    try:
        generate_quote_pdf(demo_quote, demo_client, company, str(pdf_path), design_config=design_config, client_signature_path=None)
        
        # Retourner le fichier PDF
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename="apercu_devis.pdf"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating preview: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating preview: {str(e)}"
        )


@router.get("/{quote_id}", response_model=QuoteRead)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère un devis spécifique par son ID.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Charger le devis avec ses lignes pour calculer les totaux
    from sqlalchemy.orm import joinedload
    quote = db.query(Quote).options(joinedload(Quote.lines)).filter(
        Quote.id == quote_id,
        Quote.company_id == current_user.company_id
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # S'assurer que les totaux sont à jour (recalculer si nécessaire, sans modifier la DB)
    # On recalcule juste pour la réponse, sans commit
    if quote.lines:
        # Vérifier si les totaux sont cohérents avec les lignes
        calculated_subtotal = sum(line.subtotal_ht for line in quote.lines)
        calculated_tax = sum(line.tax_amount for line in quote.lines)
        calculated_ttc_before_discount = sum(line.total_ttc for line in quote.lines)
        
        # Si les totaux ne correspondent pas, recalculer (mais ne pas sauvegarder)
        if (quote.subtotal_ht != calculated_subtotal or 
            quote.total_tax != calculated_tax or
            (quote.discount_type and quote.discount_value and quote.total_ttc != calculated_ttc_before_discount)):
            recalculate_quote_totals(quote)
            # Sauvegarder les totaux recalculés
            db.commit()
            db.refresh(quote)
    
    # Ajouter les noms de client et projet
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    if client:
        quote.client_name = client.name
        quote.client_email = client.email  # Ajouter l'email du client pour le formulaire d'envoi
    if quote.project_id:
        project = db.query(Project).filter(Project.id == quote.project_id).first()
        if project:
            quote.project_name = project.name
    
    return quote


@router.post("", response_model=QuoteRead, status_code=status.HTTP_201_CREATED)
def create_quote(
    quote_data: QuoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un nouveau devis.
    Génère automatiquement le numéro séquentiel.
    """
    try:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not attached to a company"
            )
        
        # Vérifier que le client existe et appartient à l'entreprise
        client = get_client_info(db, quote_data.client_id, current_user.company_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Récupérer l'entreprise
        company = get_company_info(db, current_user.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Récupérer les settings de l'entreprise pour les taux de TVA
        from app.db.models.company_settings import CompanySettings
        company_settings_obj = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        company_settings = company_settings_obj.settings if company_settings_obj else None
        valid_tax_rates = get_valid_tax_rates(company_settings)
        
        # Générer le numéro de devis
        number = generate_quote_number(db, current_user.company_id)
        
        # Déterminer le statut
        print(f"[QUOTE CREATE] Statut reçu depuis le frontend: '{quote_data.status}'")
        if quote_data.status:
            try:
                quote_status = QuoteStatus(quote_data.status)
                print(f"[QUOTE CREATE] Statut converti: {quote_status}")
            except ValueError as e:
                print(f"[QUOTE CREATE] ❌ Erreur de conversion du statut: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {quote_data.status}. Valid statuses: brouillon, envoyé, vu, accepté, refusé"
                )
        else:
            quote_status = QuoteStatus.BROUILLON
            print(f"[QUOTE CREATE] Aucun statut fourni, utilisation du statut par défaut: {quote_status}")
        
        # Créer le devis
        quote = Quote(
            company_id=current_user.company_id,
            client_id=quote_data.client_id,
            project_id=quote_data.project_id,
            number=number,
            status=quote_status,
            notes=quote_data.notes,
            conditions=quote_data.conditions,
            discount_type=quote_data.discount_type,
            discount_value=quote_data.discount_value,
            discount_label=quote_data.discount_label,
            amount=Decimal("0"),  # Sera recalculé
        )
        
        db.add(quote)
        db.flush()  # Pour obtenir l'ID
        
        # Créer les lignes et calculer les totaux
        subtotal_ht_total = Decimal("0")
        total_tax_total = Decimal("0")
        total_ttc_total = Decimal("0")
        
        for idx, line_data in enumerate(quote_data.lines):
            # Valider le taux de TVA
            if not validate_tax_rate(line_data.tax_rate, company_settings):
                valid_rates_str = ", ".join([str(rate) for rate in valid_tax_rates])
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid tax rate: {line_data.tax_rate}. Valid rates: {valid_rates_str}"
                )
            
            # Calculer les totaux de la ligne
            line_totals = calculate_line_totals(
                line_data.quantity,
                line_data.unit_price_ht,
                line_data.tax_rate
            )
            
            # Ajouter aux totaux
            subtotal_ht_total += line_totals["subtotal_ht"]
            total_tax_total += line_totals["tax_amount"]
            total_ttc_total += line_totals["total_ttc"]
            
            quote_line = QuoteLine(
                quote_id=quote.id,
                description=line_data.description,
                quantity=line_data.quantity,
                unit=line_data.unit,
                unit_price_ht=line_data.unit_price_ht,
                tax_rate=line_data.tax_rate,
                subtotal_ht=line_totals["subtotal_ht"],
                tax_amount=line_totals["tax_amount"],
                total_ttc=line_totals["total_ttc"],
                order=line_data.order if line_data.order is not None else idx,
            )
            
            db.add(quote_line)
        
        # Mettre à jour les totaux du devis
        quote.subtotal_ht = subtotal_ht_total
        quote.total_tax = total_tax_total
        quote.total_ttc = total_ttc_total
        quote.amount = total_ttc_total  # Pour compatibilité
        
        db.commit()
        db.refresh(quote)
        
        # Ajouter les noms de client et projet
        quote.client_name = client.name
        quote.client_email = client.email  # Ajouter l'email du client
        if quote.project_id:
            project = db.query(Project).filter(Project.id == quote.project_id).first()
            if project:
                quote.project_name = project.name
        
        # Si le devis est envoyé, créer une conversation dans l'inbox et envoyer par email
        print(f"[QUOTE CREATE] Statut du devis: {quote_status} (type: {type(quote_status)})")
        print(f"[QUOTE CREATE] QuoteStatus.ENVOYE: {QuoteStatus.ENVOYE}")
        print(f"[QUOTE CREATE] Comparaison: {quote_status == QuoteStatus.ENVOYE}")
        
        # Générer un token public si le devis est envoyé
        if quote_status == QuoteStatus.ENVOYE and not quote.public_token:
            quote.public_token = secrets.token_urlsafe(32)  # Token sécurisé de 32 bytes (44 caractères en base64)
            # Token valide 90 jours par défaut
            quote.public_token_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
            db.commit()
            db.refresh(quote)
        
        if quote_status == QuoteStatus.ENVOYE:
            print(f"[QUOTE CREATE] ✅ Statut 'envoyé' détecté, envoi du devis via inbox...")
            try:
                _send_quote_via_inbox(db, quote, client, company, current_user)
            except Exception as e:
                # On log l'erreur mais on ne fait pas échouer la création du devis
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors de l'envoi du devis via inbox: {e}", exc_info=True)
                print(f"[QUOTE CREATE] ❌ Erreur lors de l'envoi: {e}")
                import traceback
                traceback.print_exc()
            
            # Créer une relance automatique pour le devis envoyé
            try:
                create_automatic_followup_for_quote(db, quote, current_user.id)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors de la création de la relance automatique: {e}", exc_info=True)
                # Ne pas faire échouer la création du devis si la relance échoue
        else:
            print(f"[QUOTE CREATE] ⏭️ Statut '{quote_status}' n'est pas 'envoyé', pas d'envoi")
        
        return quote
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating quote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating quote: {str(e)}"
        )


@router.put("/{quote_id}", response_model=QuoteRead)
def update_quote(
    quote_id: int,
    quote_data: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour un devis.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.company_id == current_user.company_id
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # PROTECTION SÉCURITÉ : Empêcher la modification d'un devis signé
    existing_signature = db.query(QuoteSignature).filter(
        QuoteSignature.quote_id == quote_id
    ).first()
    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify a signed quote. The quote has been electronically signed and is locked."
        )
    
    # Mettre à jour les champs
    if quote_data.client_id is not None:
        client = get_client_info(db, quote_data.client_id, current_user.company_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        quote.client_id = quote_data.client_id
    
    if quote_data.project_id is not None:
        quote.project_id = quote_data.project_id
    
    # Variable pour savoir si on doit envoyer l'email
    should_send_email = False
    
    if quote_data.status is not None:
        try:
            new_status = QuoteStatus(quote_data.status)
            old_status = quote.status
            # Générer un token public si le devis passe à "envoyé"
            if new_status == QuoteStatus.ENVOYE and not quote.public_token:
                quote.public_token = secrets.token_urlsafe(32)
                # Token valide 90 jours par défaut
                quote.public_token_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
            quote.status = new_status
            
            # Si le statut passe à "envoyé", créer une relance automatique
            if new_status == QuoteStatus.ENVOYE:
                try:
                    create_automatic_followup_for_quote(db, quote, current_user.id)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Erreur lors de la création de la relance automatique: {e}", exc_info=True)
                    # Ne pas faire échouer la mise à jour si la relance échoue
                
                # Si le statut passe de "brouillon" à "envoyé", envoyer l'email
                if old_status == QuoteStatus.BROUILLON:
                    quote.sent_at = datetime.now(timezone.utc)
                    # Envoyer l'email après le commit
                    should_send_email = True
                else:
                    should_send_email = False
            else:
                should_send_email = False
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {quote_data.status}"
            )
    else:
        should_send_email = False
    
    if quote_data.notes is not None:
        quote.notes = quote_data.notes
    
    if quote_data.conditions is not None:
        quote.conditions = quote_data.conditions
    
    if quote_data.valid_until is not None:
        quote.valid_until = quote_data.valid_until
    
    if quote_data.service_start_date is not None:
        quote.service_start_date = quote_data.service_start_date
    
    if quote_data.execution_duration is not None:
        quote.execution_duration = quote_data.execution_duration
    
    if quote_data.discount_type is not None:
        quote.discount_type = quote_data.discount_type
    if quote_data.discount_value is not None:
        quote.discount_value = quote_data.discount_value
    if quote_data.discount_label is not None:
        quote.discount_label = quote_data.discount_label
    
    # Si la réduction a été modifiée, recalculer les totaux même si les lignes ne changent pas
    discount_changed = (
        quote_data.discount_type is not None or 
        quote_data.discount_value is not None or 
        quote_data.discount_label is not None
    )
    
    # Récupérer les settings de l'entreprise pour les taux de TVA
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    valid_tax_rates = get_valid_tax_rates(company_settings)
    
    # PROTECTION SÉCURITÉ : Empêcher la modification des lignes d'un devis signé
    existing_signature = db.query(QuoteSignature).filter(
        QuoteSignature.quote_id == quote_id
    ).first()
    if existing_signature and quote_data.lines is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify lines of a signed quote. The quote has been electronically signed and is locked."
        )
    
    # Mettre à jour les lignes si fournies
    if quote_data.lines is not None:
            # Supprimer les anciennes lignes
            db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).delete()
            
            # Créer les nouvelles lignes
            for idx, line_data in enumerate(quote_data.lines):
                # Valider le taux de TVA
                if not validate_tax_rate(line_data.tax_rate, company_settings):
                    valid_rates_str = ", ".join([str(rate) for rate in valid_tax_rates])
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid tax rate: {line_data.tax_rate}. Valid rates: {valid_rates_str}"
                    )
                
                # Calculer les totaux de la ligne
                line_totals = calculate_line_totals(
                    line_data.quantity,
                    line_data.unit_price_ht,
                    line_data.tax_rate
                )
                
                quote_line = QuoteLine(
                    quote_id=quote.id,
                    description=line_data.description,
                    quantity=line_data.quantity,
                    unit_price_ht=line_data.unit_price_ht,
                    tax_rate=line_data.tax_rate,
                    subtotal_ht=line_totals["subtotal_ht"],
                    tax_amount=line_totals["tax_amount"],
                    total_ttc=line_totals["total_ttc"],
                    order=line_data.order if line_data.order is not None else idx,
                )
                
                db.add(quote_line)
    
    # Recalculer les totaux (toujours, même si seulement la réduction a changé)
    # Si les lignes n'ont pas été modifiées mais que la réduction a changé, on doit quand même recalculer
    if quote_data.lines is not None:
        # Les lignes ont été modifiées, recalculer
        recalculate_quote_totals(quote)
    elif discount_changed:
        # Seulement la réduction a changé, recalculer quand même
        recalculate_quote_totals(quote)
    elif not quote.lines:
        # Si pas de lignes, initialiser à zéro
        quote.subtotal_ht = Decimal("0")
        quote.total_tax = Decimal("0")
        quote.total_ttc = Decimal("0")
        quote.amount = Decimal("0")
    
    db.commit()
    db.refresh(quote)
    
    # Si le statut est passé à "envoyé", envoyer l'email
    if should_send_email:
        try:
            client = get_client_info(db, quote.client_id, current_user.company_id)
            company = get_company_info(db, current_user.company_id)
            if client and company:
                _send_quote_via_inbox(db, quote, client, company, current_user)
        except Exception as e:
            # On log l'erreur mais on ne fait pas échouer la mise à jour
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de l'envoi de l'email pour le devis {quote.number}: {e}", exc_info=True)
    
    # Ajouter les noms de client et projet
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    if client:
        quote.client_name = client.name
    if quote.project_id:
        project = db.query(Project).filter(Project.id == quote.project_id).first()
        if project:
            quote.project_name = project.name
    
    return quote


@router.get("/{quote_id}/pdf")
def get_quote_pdf(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Génère et retourne le PDF d'un devis.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.company_id == current_user.company_id
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Récupérer le client et l'entreprise
    client = get_client_info(db, quote.client_id, current_user.company_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    company = get_company_info(db, current_user.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    try:
        # SÉCURITÉ : Vérifier l'intégrité si le devis est signé
        existing_signature = db.query(QuoteSignature).filter(
            QuoteSignature.quote_id == quote_id
        ).first()
        
        # Générer le PDF en mémoire
        quotes_dir = Path(settings.UPLOAD_DIR) / str(current_user.company_id) / "quotes"
        quotes_dir.mkdir(parents=True, exist_ok=True)
        
        pdf_filename = f"devis_{quote.number}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = quotes_dir / pdf_filename
        
        # Récupérer la configuration de design depuis les settings
        design_config = {}
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings and company_settings.settings:
            billing_settings = company_settings.settings.get("billing", {})
            design_config = billing_settings.get("quote_design", {})
        
        # Générer le PDF avec la signature du client si elle existe
        client_signature_path = quote.client_signature_path if hasattr(quote, 'client_signature_path') else None
        generate_quote_pdf(quote, client, company, str(pdf_path), design_config=design_config, client_signature_path=client_signature_path)
        
        # SÉCURITÉ : Pour un devis signé, servir uniquement le PDF archivé (non modifiable)
        if existing_signature and existing_signature.signed_pdf_path:
            # Servir le PDF archivé original au lieu de régénérer
            archived_pdf_path = Path(settings.UPLOAD_DIR) / existing_signature.signed_pdf_path
            if archived_pdf_path.exists():
                with open(archived_pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                
                # Vérifier l'intégrité du PDF archivé
                current_hash = hashlib.sha256(pdf_bytes).hexdigest()
                if current_hash != existing_signature.signature_hash:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(
                        f"CRITICAL: PDF integrity mismatch for signed quote {quote_id}: "
                        f"expected={existing_signature.signature_hash}, got={current_hash}. "
                        f"The archived PDF may have been tampered with!"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Erreur d'intégrité du PDF signé. Le document peut avoir été modifié."
                    )
                
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="devis_{quote.number}_signed.pdf"'
                    }
                )
            else:
                # PDF archivé manquant - cas critique
                import logging
                logger = logging.getLogger(__name__)
                logger.error(
                    f"CRITICAL: Archived PDF missing for signed quote {quote_id}: "
                    f"{existing_signature.signed_pdf_path}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Le PDF signé archivé est introuvable. Contactez le support."
                )
        
        # Lire le PDF généré
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        # Optionnel: supprimer le fichier temporaire après lecture
        # os.remove(pdf_path)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="devis_{quote.number}.pdf"'
            }
        )
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service PDF non disponible: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du PDF: {str(e)}"
        )


@router.post("/{quote_id}/convert-to-invoice", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def convert_quote_to_invoice(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Convertit un devis en facture directement.
    Crée une facture avec toutes les données du devis.
    """
    try:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not attached to a company"
            )
        
        # Récupérer le devis avec ses lignes
        from sqlalchemy.orm import joinedload
        quote = db.query(Quote).options(joinedload(Quote.lines)).filter(
            Quote.id == quote_id,
            Quote.company_id == current_user.company_id
        ).first()
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        # Forcer le chargement des lignes si elles ne sont pas déjà chargées
        if not hasattr(quote, 'lines') or quote.lines is None:
            quote.lines = db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).all()
        
        # Vérifier que le devis a des lignes
        if not quote.lines or len(quote.lines) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le devis ne contient aucune ligne. Impossible de créer une facture."
            )
        
        # SÉCURITÉ : Vérifier que le devis est signé par le client avant la conversion
        existing_signature = db.query(QuoteSignature).filter(
            QuoteSignature.quote_id == quote_id
        ).first()
        
        if not existing_signature:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Impossible de convertir ce devis en facture. Le devis doit être signé par le client avant la conversion."
            )
        
        # Vérifier que le devis n'a pas déjà été converti
        existing_invoice = db.query(Invoice).filter(
            Invoice.quote_id == quote_id,
            Invoice.company_id == current_user.company_id
        ).first()
        
        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce devis a déjà été converti en facture (facture {existing_invoice.number})"
            )
        
        # Récupérer le client et l'entreprise
        client = get_client_info(db, quote.client_id, current_user.company_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        company = get_company_info(db, current_user.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Récupérer les settings de l'entreprise pour les taux de TVA
        from app.db.models.company_settings import CompanySettings
        company_settings_obj = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        company_settings = company_settings_obj.settings if company_settings_obj else None
        
        # Générer le numéro de facture
        number = generate_invoice_number(db, current_user.company_id, InvoiceType.FACTURE)
        
        # Calculer la date d'échéance (30 jours par défaut)
        due_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Créer la facture depuis le devis
        invoice = Invoice(
            company_id=current_user.company_id,
            client_id=quote.client_id,
            project_id=quote.project_id,
            quote_id=quote.id,
            number=number,
            invoice_type=InvoiceType.FACTURE,
            status=InvoiceStatus.IMPAYEE,
            amount=Decimal('0'),  # Valeur temporaire, sera recalculée après création des lignes
            
            # Dates
            issue_date=datetime.now(timezone.utc),
            due_date=due_date,
            
            # Notes et conditions
            notes=quote.notes,
            conditions=quote.conditions,
            
            # Réduction/Escompte (copier depuis le devis)
            discount_type=quote.discount_type,
            discount_value=quote.discount_value,
            discount_label=quote.discount_label,
        )
        
        # Remplir les informations depuis l'entreprise et le client
        if not invoice.seller_name:
            invoice.seller_name = company.name
        if not invoice.client_name:
            invoice.client_name = client.name
        if not invoice.client_address:
            invoice.client_address = client.address
        
        # Vérifier si l'entreprise est auto-entrepreneur ou exonérée de TVA
        if company.is_auto_entrepreneur or company.vat_exempt:
            invoice.vat_applicable = False
            if company.vat_exemption_reference:
                invoice.vat_exemption_reference = company.vat_exemption_reference
            elif company.is_auto_entrepreneur:
                invoice.vat_exemption_reference = "TVA non applicable, art. 293 B du CGI"
        else:
            invoice.vat_applicable = True
        
        db.add(invoice)
        db.flush()  # Pour obtenir l'ID
        
        # Récupérer les taux de TVA autorisés
        valid_tax_rates = get_valid_tax_rates(company_settings)
        
        # Créer les lignes de facture depuis les lignes du devis
        # S'assurer que les lignes sont bien chargées
        if not quote.lines:
            # Recharger les lignes si elles ne sont pas chargées
            quote.lines = db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).all()
        
        if not quote.lines or len(quote.lines) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le devis ne contient aucune ligne. Impossible de créer une facture."
            )
        
        # Créer les lignes de facture
        invoice_lines = []
        for idx, quote_line in enumerate(quote.lines):
            # Si entreprise auto-entrepreneur ou exonérée, forcer le taux TVA à 0
            if company.is_auto_entrepreneur or company.vat_exempt:
                tax_rate = Decimal('0')
            else:
                tax_rate = Decimal(str(quote_line.tax_rate))
            
            # Calculer les totaux de la ligne
            quantity = Decimal(str(quote_line.quantity))
            unit_price = Decimal(str(quote_line.unit_price_ht))
            totals = calculate_line_totals(quantity, unit_price, tax_rate)
            
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                description=quote_line.description,
                quantity=quantity,
                unit=quote_line.unit,
                unit_price_ht=unit_price,
                tax_rate=tax_rate,
                subtotal_ht=totals['subtotal_ht'],
                tax_amount=totals['tax_amount'],
                total_ttc=totals['total_ttc'],
                order=idx
            )
            db.add(invoice_line)
            invoice_lines.append(invoice_line)
        
        # Flush pour s'assurer que les lignes sont dans la session
        db.flush()
        
        # Associer les lignes à la facture pour que recalculate_invoice_totals les trouve
        invoice.lines = invoice_lines
        
        # Flush pour s'assurer que les lignes sont dans la session
        db.flush()
        
        # Recharger la facture avec ses lignes pour que recalculate_invoice_totals les trouve
        db.refresh(invoice)
        
        # Recalculer les totaux de la facture
        recalculate_invoice_totals(invoice)
        
        # Valider les totaux
        is_valid, error_msg = validate_invoice_totals(invoice)
        if not is_valid:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur de validation des totaux: {error_msg}"
            )
        
        db.commit()
        db.refresh(invoice)
        
        # Logger la création
        try:
            from app.core.invoice_audit_service import log_invoice_creation
            from fastapi import Request
            # Créer un objet Request minimal pour le logging
            class MinimalRequest:
                client = type('obj', (object,), {'host': 'localhost'})()
            minimal_request = MinimalRequest()
            log_invoice_creation(db, invoice.id, current_user.id, minimal_request)
        except Exception as e:
            # Si le logging échoue, on continue quand même
            print(f"[QUOTE CONVERT] Erreur lors du logging: {e}")
        
        # Créer une relance automatique pour la facture impayée
        convert_logger = logging.getLogger(__name__)
        convert_logger.info(f"[QUOTE CONVERT] Statut de la facture créée: {invoice.status}")
        if invoice.status == InvoiceStatus.IMPAYEE:
            convert_logger.info(f"[QUOTE CONVERT] ✅ Statut IMPAYEE détecté, tentative de création de relance automatique pour la facture {invoice.number}")
            try:
                # Importer la fonction depuis invoices.py
                from app.api.routes.invoices import create_automatic_followup_for_invoice
                create_automatic_followup_for_invoice(db, invoice, current_user.id)
            except Exception as e:
                convert_logger.error(f"[QUOTE CONVERT] ❌ Erreur lors de la création de la relance automatique: {e}", exc_info=True)
                # Ne pas faire échouer la conversion si la relance échoue
        else:
            convert_logger.info(f"[QUOTE CONVERT] ⏭️ Statut de la facture n'est pas IMPAYEE ({invoice.status}), pas de relance automatique créée")
        
        return invoice
    
    except HTTPException:
        # Re-raise les HTTPException telles quelles
        raise
    except Exception as e:
        # Logger l'erreur complète pour le debug
        import traceback
        error_trace = traceback.format_exc()
        print(f"[QUOTE CONVERT] Erreur lors de la conversion: {e}")
        print(f"[QUOTE CONVERT] Traceback: {error_trace}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la conversion du devis en facture: {str(e)}"
        )


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime un devis.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.company_id == current_user.company_id
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    db.delete(quote)
    db.commit()
    
    return None


def _send_quote_via_inbox(
    db: Session,
    quote: Quote,
    client: Client,
    company: Company,
    current_user: User
) -> None:
    """
    Envoie un devis via l'inbox (email).
    Cherche une conversation existante avec le client, sinon en crée une nouvelle.
    Génère un PDF du devis et l'envoie par email.
    """
    print(f"[QUOTE SEND] 🚀 Début de l'envoi du devis {quote.number} pour le client {client.name} (ID: {client.id})")
    
    # Vérifier que le client a un email
    if not client.email:
        print(f"[QUOTE SEND] ❌ Impossible d'envoyer le devis {quote.number}: le client {client.name} n'a pas d'email")
        return
    
    print(f"[QUOTE SEND] ✅ Client a un email: {client.email}")
    
    # Chercher une conversation existante avec ce client
    print(f"[QUOTE SEND] 🔍 Recherche d'une conversation existante avec le client {client.id}...")
    existing_conversation = db.query(Conversation).filter(
        Conversation.company_id == current_user.company_id,
        Conversation.client_id == client.id,
        Conversation.source == "email"
    ).order_by(Conversation.last_message_at.desc()).first()
    
    # Si pas de conversation existante, en créer une nouvelle
    if not existing_conversation:
        print(f"[QUOTE SEND] 📝 Aucune conversation existante, création d'une nouvelle conversation...")
        conversation = Conversation(
            company_id=current_user.company_id,
            client_id=client.id,
            subject=f"Devis {quote.number}",
            status="À répondre",
            source="email",
            unread_count=0,
            last_message_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        db.flush()
    else:
        conversation = existing_conversation
        # Mettre à jour le sujet si nécessaire
        if not conversation.subject or f"Devis {quote.number}" not in conversation.subject:
            conversation.subject = f"Devis {quote.number}"
    
    # Recharger le devis avec ses lignes pour le PDF
    print(f"[QUOTE SEND] 🔄 Rechargement du devis avec ses lignes...")
    db.refresh(quote)
    # S'assurer que les lignes sont chargées
    _ = quote.lines
    print(f"[QUOTE SEND] ✅ Devis rechargé, {len(quote.lines)} ligne(s) trouvée(s)")
    
    # Récupérer la configuration du design depuis les settings
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    design_config = {}
    if company_settings_obj and company_settings_obj.settings:
        billing_design = company_settings_obj.settings.get("billing", {}).get("quote_design", {})
        design_config = {
            "primary_color": billing_design.get("primary_color", "#F97316"),
            "secondary_color": billing_design.get("secondary_color", "#F0F0F0"),
            "logo_path": billing_design.get("logo_path"),
            "signature_path": billing_design.get("signature_path"),
            "footer_text": billing_design.get("footer_text"),
            "terms_text": billing_design.get("terms_text")
        }
        print(f"[QUOTE SEND] 🎨 Configuration du design: {design_config}")
    
    # Générer le PDF du devis
    print(f"[QUOTE SEND] 📄 Génération du PDF du devis...")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Créer un sous-dossier pour les PDFs de devis
    quotes_dir = upload_dir / str(current_user.company_id) / "quotes"
    quotes_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_filename = f"devis_{quote.number}_{uuid.uuid4().hex[:8]}.pdf"
    pdf_path = quotes_dir / pdf_filename
    
    try:
        client_signature_path = quote.client_signature_path if hasattr(quote, 'client_signature_path') else None
        generate_quote_pdf(quote, client, company, str(pdf_path), design_config=design_config, client_signature_path=client_signature_path)
        print(f"[QUOTE SEND] ✅ PDF généré avec succès: {pdf_path}")
    except Exception as e:
        print(f"[QUOTE SEND] ❌ Erreur lors de la génération du PDF: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Créer le message dans la conversation
    # Construire le lien de signature si le token public existe
    from app.core.config import settings
    frontend_url = settings.FRONTEND_URL
    
    # Générer le token si ce n'est pas déjà fait
    if not quote.public_token:
        quote.public_token = secrets.token_urlsafe(32)
        quote.public_token_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
        db.commit()
        db.refresh(quote)
    
    signature_link = f"{frontend_url}/quote/{quote.public_token}"
    
    # Charger le template d'email depuis les settings
    email_template = None
    if company_settings_obj and company_settings_obj.settings:
        billing_settings = company_settings_obj.settings.get("billing", {})
        email_template = billing_settings.get("quote_email_template")
    
    # Si pas de template personnalisé, utiliser le template par défaut
    if not email_template:
        email_template = "Bonjour,\n\nVeuillez trouver ci-joint le devis {quote_number}.\n\nPour signer ce devis électroniquement, veuillez cliquer sur le lien de la signature : {signature_link}\n\n{notes}\n\nCordialement"
    
    # Remplacer les variables du template (remplacer toutes les occurrences)
    notes_text = f"Notes: {quote.notes}" if quote.notes else ""
    message_content = email_template.replace("{quote_number}", quote.number).replace("{signature_link}", signature_link).replace("{notes}", notes_text)
    # Nettoyer tous les placeholders restants (au cas où le template personnalisé en contiendrait plusieurs)
    while "{signature_link}" in message_content:
        message_content = message_content.replace("{signature_link}", signature_link)
    
    message = InboxMessage(
        conversation_id=conversation.id,
        from_name=current_user.full_name or company.name or "Équipe",
        from_email=None,  # Sera rempli par l'intégration SMTP
        from_phone=None,
        content=message_content,
        source="email",
        is_from_client=False,
        read=True,
    )
    db.add(message)
    db.flush()
    
    # Créer la pièce jointe pour le PDF
    attachment = MessageAttachment(
        message_id=message.id,
        name=f"Devis_{quote.number}.pdf",
        file_type="pdf",
        file_path=f"{current_user.company_id}/quotes/{pdf_filename}",
        file_size=pdf_path.stat().st_size if pdf_path.exists() else 0,
        mime_type="application/pdf",
    )
    db.add(attachment)
    
    # Mettre à jour la conversation
    conversation.last_message_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(conversation)
    db.refresh(message)
    
    # Récupérer l'intégration inbox principale pour envoyer l'email
    print(f"[QUOTE SEND] 🔍 Recherche de l'intégration inbox principale...")
    primary_integration = db.query(InboxIntegration).filter(
        InboxIntegration.company_id == current_user.company_id,
        InboxIntegration.is_primary == True,
        InboxIntegration.is_active == True,
        InboxIntegration.integration_type == "imap"
    ).first()
    
    if not primary_integration:
        print(f"[QUOTE SEND] ❌ Aucune intégration inbox principale trouvée")
        return
    
    if not primary_integration.email_address:
        print(f"[QUOTE SEND] ❌ L'intégration inbox n'a pas d'adresse email configurée")
        return
    
    if not primary_integration.email_password:
        print(f"[QUOTE SEND] ❌ L'intégration inbox n'a pas de mot de passe configuré")
        return
    
    print(f"[QUOTE SEND] ✅ Intégration inbox trouvée: {primary_integration.email_address}")
    
    # Envoyer l'email via SMTP
    try:
        smtp_config = get_smtp_config(primary_integration.email_address)
        
        # Préparer la pièce jointe pour l'envoi SMTP
        smtp_attachments = [{
            "path": str(pdf_path),
            "filename": f"Devis_{quote.number}.pdf"
        }]
        
        print(f"[QUOTE SEND] Envoi du devis {quote.number} via SMTP de {primary_integration.email_address} à {client.email}")
        
        send_email_smtp(
            smtp_server=smtp_config["smtp_server"],
            smtp_port=smtp_config["smtp_port"],
            email_address=primary_integration.email_address,
            password=primary_integration.email_password,
            to_email=client.email,
            subject=f"Devis {quote.number}",
            content=message_content,
            use_tls=smtp_config["use_tls"],
            attachments=smtp_attachments,
            from_name=current_user.full_name or company.name
        )
        
        print(f"[QUOTE SEND] Devis {quote.number} envoyé avec succès à {client.email}")
        
    except Exception as e:
        print(f"[QUOTE SEND] Erreur lors de l'envoi de l'email: {e}")
        import traceback
        traceback.print_exc()
        # On ne fait pas échouer la création du devis si l'envoi échoue


@router.post("/{quote_id}/send-email", response_model=dict)
async def send_quote_email(
    quote_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envoie un devis par email avec des paramètres personnalisés (sujet, contenu, destinataires supplémentaires, pièces jointes).
    Accepte FormData avec les fichiers uploadés.
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Récupérer les données du formulaire (FormData)
        form_data = await request.form()
        
        logger.info(f"[SEND EMAIL] Début de l'envoi d'email pour le devis {quote_id}")
        
        # Récupérer les champs texte (ne pas utiliser get() directement car FormData peut avoir des types différents)
        subject = ""
        content = ""
        additional_recipients_str = "[]"
        
        # Récupérer le sujet
        subject_item = form_data.get("subject")
        if subject_item:
            # S'assurer que ce n'est pas un fichier
            if isinstance(subject_item, UploadFile):
                logger.error("[SEND EMAIL] Le sujet est un fichier au lieu d'une chaîne!")
                subject = ""
            else:
                subject = subject_item if isinstance(subject_item, str) else str(subject_item)
        
        # Récupérer le contenu
        content_item = form_data.get("content")
        if content_item:
            # S'assurer que ce n'est pas un fichier
            if isinstance(content_item, UploadFile):
                logger.error("[SEND EMAIL] Le contenu est un fichier au lieu d'une chaîne!")
                content = ""
            else:
                content = content_item if isinstance(content_item, str) else str(content_item)
        
        # Récupérer les destinataires supplémentaires
        recipients_item = form_data.get("additional_recipients")
        if recipients_item:
            if isinstance(recipients_item, UploadFile):
                logger.error("[SEND EMAIL] Les destinataires sont un fichier au lieu d'une chaîne!")
                additional_recipients_str = "[]"
            else:
                additional_recipients_str = recipients_item if isinstance(recipients_item, str) else str(recipients_item)
        
        logger.info(f"[SEND EMAIL] Sujet: {subject[:50] if subject else 'vide'}...")
        logger.info(f"[SEND EMAIL] Contenu: {len(content)} caractères")
        logger.info(f"[SEND EMAIL] Contenu (premiers 200 chars): {content[:200] if content else 'vide'}")
        logger.info(f"[SEND EMAIL] Type du contenu: {type(content)}")
        logger.info(f"[SEND EMAIL] Destinataires supplémentaires (raw): {additional_recipients_str}")
        
        # Sauvegarder le contenu dans une variable séparée pour éviter qu'il soit écrasé
        email_content_text = content
        
        # Parser les destinataires supplémentaires (JSON string)
        additional_recipients = []
        try:
            import json
            if additional_recipients_str and additional_recipients_str.strip():
                # Nettoyer la chaîne si nécessaire
                cleaned_str = additional_recipients_str.strip()
                if cleaned_str.startswith('"') and cleaned_str.endswith('"'):
                    cleaned_str = cleaned_str[1:-1]
                additional_recipients = json.loads(cleaned_str) if cleaned_str else []
                logger.info(f"[SEND EMAIL] Destinataires supplémentaires parsés: {additional_recipients}")
            else:
                logger.info(f"[SEND EMAIL] Aucun destinataire supplémentaire (chaîne vide)")
        except json.JSONDecodeError as e:
            logger.error(f"[SEND EMAIL] Erreur JSON lors du parsing des destinataires: {e}, chaîne reçue: {additional_recipients_str}")
            additional_recipients = []
        except Exception as e:
            logger.error(f"[SEND EMAIL] Erreur lors du parsing des destinataires: {e}, type: {type(additional_recipients_str)}")
            additional_recipients = []
        
        # Récupérer les fichiers uploadés
        uploaded_files = []
        logger.info(f"[SEND EMAIL] Clés dans form_data: {list(form_data.keys())}")
        
        # FastAPI stocke les fichiers dans form_data avec leur nom de champ
        try:
            for key in form_data.keys():
                if key.startswith("attachment_"):
                    file_item = form_data[key]
                    logger.info(f"[SEND EMAIL] Fichier trouvé: {key}, type: {type(file_item)}")
                    
                    # Vérifier si c'est un UploadFile (FastAPI)
                    if isinstance(file_item, UploadFile):
                        if file_item.filename:
                            uploaded_files.append(file_item)
                            logger.info(f"[SEND EMAIL] Fichier ajouté: {file_item.filename}")
                    elif hasattr(file_item, 'filename'):
                        filename = getattr(file_item, 'filename', None)
                        if filename:
                            uploaded_files.append(file_item)
                            logger.info(f"[SEND EMAIL] Fichier ajouté (autre format): {filename}")
        except Exception as e:
            logger.error(f"[SEND EMAIL] Erreur lors de la récupération des fichiers: {e}", exc_info=True)
        
        logger.info(f"[SEND EMAIL] Total fichiers uploadés: {len(uploaded_files)}")
        
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not attached to a company"
            )
        
        # Récupérer le devis
        from sqlalchemy.orm import joinedload
        quote = db.query(Quote).options(joinedload(Quote.lines)).filter(
            Quote.id == quote_id,
            Quote.company_id == current_user.company_id
        ).first()
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        # Récupérer le client et l'entreprise
        client = get_client_info(db, quote.client_id, current_user.company_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        company = get_company_info(db, current_user.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # Vérifier que le client a un email
        if not client.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le client n'a pas d'adresse email configurée"
            )
        
        # Générer un token public si nécessaire
        if not quote.public_token:
            quote.public_token = secrets.token_urlsafe(32)
            quote.public_token_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
            db.commit()
            db.refresh(quote)
        
        # Générer un token public si nécessaire
        if not quote.public_token:
            quote.public_token = secrets.token_urlsafe(32)
            quote.public_token_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
            db.commit()
            db.refresh(quote)
        
        # Ajouter le lien de signature au contenu de l'email si le token existe
        if quote.public_token:
            from app.core.config import settings
            frontend_url = settings.FRONTEND_URL
            signature_link = f"{frontend_url}/quote/{quote.public_token}"
            
            # Si le contenu est vide ou utilise le template par défaut, utiliser le template depuis les settings
            if not email_content_text or email_content_text.strip() == "":
                # Charger le template depuis les settings
                company_settings_obj = db.query(CompanySettings).filter(
                    CompanySettings.company_id == current_user.company_id
                ).first()
                
                email_template = None
                if company_settings_obj and company_settings_obj.settings:
                    billing_settings = company_settings_obj.settings.get("billing", {})
                    email_template = billing_settings.get("quote_email_template")
                
                # Si pas de template personnalisé, utiliser le template par défaut
                if not email_template:
                    email_template = "Bonjour,\n\nVeuillez trouver ci-joint le devis {quote_number}.\n\nPour signer ce devis électroniquement, veuillez cliquer sur le lien de la signature : {signature_link}\n\n{notes}\n\nCordialement"
                
                # Remplacer les variables du template (remplacer toutes les occurrences)
                notes_text = f"Notes: {quote.notes}" if quote.notes else ""
                email_content_text = email_template.replace("{quote_number}", quote.number).replace("{signature_link}", signature_link).replace("{notes}", notes_text)
                # Nettoyer tous les placeholders restants (au cas où le template personnalisé en contiendrait plusieurs)
                while "{signature_link}" in email_content_text:
                    email_content_text = email_content_text.replace("{signature_link}", signature_link)
            else:
                # Le contenu existe déjà, mais on doit quand même remplacer les placeholders s'il y en a
                # Remplacer {quote_number} si présent
                if "{quote_number}" in email_content_text:
                    email_content_text = email_content_text.replace("{quote_number}", quote.number)
                # Remplacer {signature_link} si présent (remplacer toutes les occurrences)
                if "{signature_link}" in email_content_text:
                    while "{signature_link}" in email_content_text:
                        email_content_text = email_content_text.replace("{signature_link}", signature_link)
                # Remplacer {notes} si présent
                if "{notes}" in email_content_text:
                    notes_text = f"Notes: {quote.notes}" if quote.notes else ""
                    email_content_text = email_content_text.replace("{notes}", notes_text)
            
            # Vérifier si le lien n'est pas déjà dans le contenu
            if signature_link not in email_content_text:
                import re
                # Chercher si le texte mentionne "lien de la signature" sans URL
                pattern = r'(lien de la signature[^:]*:?\s*)(?!http)'
                if re.search(pattern, email_content_text, re.IGNORECASE):
                    # Remplacer le texte "lien de la signature" par le lien réel
                    email_content_text = re.sub(
                        pattern,
                        f'lien de la signature : {signature_link}',
                        email_content_text,
                        flags=re.IGNORECASE
                    )
                    logger.info(f"[SEND EMAIL] Lien de signature remplacé dans le texte")
                else:
                    # Ajouter le lien à la fin si pas déjà présent
                    email_content_text += f"\n\nPour signer ce devis électroniquement, veuillez cliquer sur le lien suivant :\n{signature_link}\n"
                    logger.info(f"[SEND EMAIL] Lien de signature ajouté à la fin")
            else:
                logger.info(f"[SEND EMAIL] Lien de signature déjà présent dans le contenu")
            
            logger.info(f"[SEND EMAIL] Lien de signature final: {signature_link}")
            logger.info(f"[SEND EMAIL] Contenu final (premiers 300 chars): {email_content_text[:300]}")
        
        # Mettre à jour le statut à "envoyé" si nécessaire
        if quote.status != QuoteStatus.ENVOYE:
            quote.status = QuoteStatus.ENVOYE
            quote.sent_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(quote)
        
        # Récupérer l'intégration inbox principale
        primary_integration = db.query(InboxIntegration).filter(
            InboxIntegration.company_id == current_user.company_id,
            InboxIntegration.is_primary == True,
            InboxIntegration.is_active == True,
            InboxIntegration.integration_type == "imap"
        ).first()
        
        if not primary_integration or not primary_integration.email_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucune intégration email principale configurée"
            )
        
        # Construire la liste des destinataires
        recipients = [client.email]
        if additional_recipients:
            # Filtrer les emails vides
            valid_additional = [r for r in additional_recipients if r and r.strip()]
            recipients.extend(valid_additional)
            logger.info(f"[SEND EMAIL] Destinataires finaux: {recipients}")
        
        # Générer le PDF du devis
        from app.db.models.company_settings import CompanySettings
        company_settings_obj = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        design_config = {}
        if company_settings_obj and company_settings_obj.settings:
            billing_design = company_settings_obj.settings.get("billing", {}).get("quote_design", {})
            design_config = {
                "primary_color": billing_design.get("primary_color", "#F97316"),
                "secondary_color": billing_design.get("secondary_color", "#F0F0F0"),
                "logo_path": billing_design.get("logo_path"),
                "signature_path": billing_design.get("signature_path"),
                "footer_text": billing_design.get("footer_text"),
                "terms_text": billing_design.get("terms_text")
            }
        
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        quotes_dir = upload_dir / str(current_user.company_id) / "quotes"
        quotes_dir.mkdir(parents=True, exist_ok=True)
        
        pdf_filename = f"devis_{quote.number}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = quotes_dir / pdf_filename
        
        try:
            client_signature_path = quote.client_signature_path if hasattr(quote, 'client_signature_path') else None
            generate_quote_pdf(quote, client, company, str(pdf_path), design_config=design_config, client_signature_path=client_signature_path)
        except Exception as e:
            logger.error(f"[SEND EMAIL] Erreur lors de la génération du PDF: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la génération du PDF: {str(e)}"
            )
        
        # Préparer les pièces jointes
        attachments = [{
            "path": str(pdf_path),
            "filename": f"Devis_{quote.number}.pdf"
        }]
        
        # Sauvegarder les fichiers uploadés et les ajouter aux pièces jointes
        attachments_dir = upload_dir / str(current_user.company_id) / "email_attachments"
        attachments_dir.mkdir(parents=True, exist_ok=True)
        
        for uploaded_file in uploaded_files:
            try:
                # Récupérer le nom du fichier
                filename = uploaded_file.filename if isinstance(uploaded_file, UploadFile) else getattr(uploaded_file, 'filename', 'attachment')
                logger.info(f"[SEND EMAIL] Traitement du fichier: {filename}")
                
                # Générer un nom de fichier unique
                file_ext = Path(filename).suffix if filename else ""
                unique_filename = f"{uuid.uuid4().hex[:8]}{file_ext}"
                file_path = attachments_dir / unique_filename
                
                # Sauvegarder le fichier
                with open(file_path, "wb") as f:
                    if isinstance(uploaded_file, UploadFile):
                        file_content = await uploaded_file.read()
                    else:
                        # Si c'est un autre type, essayer de lire le contenu
                        file_content = await uploaded_file.read() if hasattr(uploaded_file, 'read') else b""
                    f.write(file_content)
                
                logger.info(f"[SEND EMAIL] Fichier sauvegardé: {file_path}")
                
                attachments.append({
                    "path": str(file_path),
                    "filename": filename or "attachment"
                })
            except Exception as e:
                logger.error(f"[SEND EMAIL] Erreur lors de la sauvegarde de la pièce jointe {filename}: {e}", exc_info=True)
                # Ne pas faire échouer l'envoi si un fichier ne peut pas être sauvegardé
        
        # Envoyer l'email à tous les destinataires
        smtp_config = get_smtp_config(primary_integration.email_address)
        sent_count = 0
        last_error = None
        
        logger.info(f"[SEND EMAIL] Envoi à {len(recipients)} destinataire(s) avec {len(attachments)} pièce(s) jointe(s)")
        logger.info(f"[SEND EMAIL] Configuration SMTP: {smtp_config['smtp_server']}:{smtp_config['smtp_port']} (TLS: {smtp_config['use_tls']})")
        logger.info(f"[SEND EMAIL] Email expéditeur: {primary_integration.email_address}")
        
        for recipient in recipients:
            try:
                logger.info(f"[SEND EMAIL] Envoi en cours à {recipient}...")
                logger.info(f"[SEND EMAIL] Contenu à envoyer (premiers 200 chars): {email_content_text[:200] if email_content_text else 'vide'}")
                logger.info(f"[SEND EMAIL] Type du contenu avant envoi: {type(email_content_text)}")
                
                # S'assurer que le contenu est bien une chaîne de caractères
                final_content = email_content_text if isinstance(email_content_text, str) else str(email_content_text) if email_content_text else ""
                
                send_email_smtp(
                    smtp_server=smtp_config["smtp_server"],
                    smtp_port=smtp_config["smtp_port"],
                    email_address=primary_integration.email_address,
                    password=primary_integration.email_password,
                    to_email=recipient,
                    subject=subject or f"Devis {quote.number}",
                    content=final_content,
                    use_tls=smtp_config["use_tls"],
                    attachments=attachments,
                    from_name=current_user.full_name or company.name
                )
                sent_count += 1
                logger.info(f"[SEND EMAIL] Email envoyé avec succès à {recipient}")
            except Exception as e:
                last_error = str(e)
                logger.error(f"[SEND EMAIL] Erreur lors de l'envoi à {recipient}: {e}", exc_info=True)
                # Continuer avec les autres destinataires
        
        logger.info(f"[SEND EMAIL] Résultat: {sent_count}/{len(recipients)} emails envoyés")
        
        if sent_count == 0:
            error_detail = "Aucun email n'a pu être envoyé. Vérifiez la configuration SMTP et les logs."
            if last_error:
                error_detail += f" Dernière erreur: {last_error}"
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_detail
            )
        
        # Mettre à jour le statut du devis à "envoyé" si ce n'est pas déjà le cas
        if quote.status != QuoteStatus.ENVOYE:
            quote.status = QuoteStatus.ENVOYE
            if not quote.sent_at:
                quote.sent_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(quote)
            logger.info(f"[SEND EMAIL] ✅ Statut du devis mis à jour à 'envoyé'")
        
        # Créer une conversation dans l'inbox pour enregistrer l'envoi
        try:
            # Chercher une conversation existante avec le client
            existing_conversation = db.query(Conversation).filter(
                Conversation.company_id == current_user.company_id,
                Conversation.client_id == quote.client_id,
                Conversation.source == "email"
            ).order_by(Conversation.last_message_at.desc()).first()
            
            if not existing_conversation:
                # Créer une nouvelle conversation
                conversation = Conversation(
                    company_id=current_user.company_id,
                    client_id=quote.client_id,
                    subject=subject or f"Devis {quote.number}",
                    status="À répondre",
                    source="email",
                    unread_count=0,
                    last_message_at=datetime.now(timezone.utc),
                )
                db.add(conversation)
                db.flush()
                logger.info(f"[SEND EMAIL] ✅ Conversation créée pour l'envoi du devis {quote.number}")
            else:
                conversation = existing_conversation
                # Mettre à jour le sujet et la date
                if not conversation.subject or f"Devis {quote.number}" not in conversation.subject:
                    conversation.subject = subject or f"Devis {quote.number}"
                conversation.last_message_at = datetime.now(timezone.utc)
                db.flush()
                logger.info(f"[SEND EMAIL] ✅ Conversation existante mise à jour pour le devis {quote.number}")
            
            # Récupérer l'intégration inbox principale pour obtenir l'email expéditeur
            # Utiliser l'integration déjà récupérée plus haut (primary_integration)
            from_email = primary_integration.email_address if primary_integration else current_user.email or "noreply@lokario.fr"
            from_name = current_user.full_name or company.name or "Équipe"
            
            # Créer un message dans la conversation pour enregistrer l'envoi
            message = InboxMessage(
                conversation_id=conversation.id,
                from_name=from_name,
                from_email=from_email,
                content=email_content_text,
                is_from_client=False,  # Message envoyé par l'entreprise
                source="email",
            )
            db.add(message)
            db.flush()  # Flush pour obtenir l'ID du message
            
            # Ajouter le PDF en pièce jointe si disponible
            if attachments and len(attachments) > 0:
                pdf_attachment = attachments[0]  # Le premier est normalement le PDF du devis
                pdf_path = Path(pdf_attachment.get("path", ""))
                if pdf_path.exists():
                    # Extraire le nom de fichier depuis le chemin ou utiliser celui fourni
                    filename = pdf_attachment.get("filename", pdf_path.name)
                    # Le file_path doit être relatif au répertoire d'upload pour être cohérent avec le reste
                    try:
                        relative_path = str(pdf_path.relative_to(Path(settings.UPLOAD_DIR)))
                    except ValueError:
                        # Si le chemin n'est pas relatif à UPLOAD_DIR, utiliser le chemin complet
                        relative_path = str(pdf_path)
                    
                    attachment = MessageAttachment(
                        message_id=message.id,
                        name=filename,
                        file_type="pdf",
                        file_path=relative_path,
                        file_size=pdf_path.stat().st_size,
                        mime_type="application/pdf"
                    )
                    db.add(attachment)
                    logger.info(f"[SEND EMAIL] ✅ Pièce jointe ajoutée: {filename}")
                else:
                    logger.warning(f"[SEND EMAIL] ⚠️ Fichier PDF non trouvé: {pdf_path}")
            
            db.commit()
            logger.info(f"[SEND EMAIL] ✅ Message enregistré dans la conversation {conversation.id}")
            
        except Exception as e:
            logger.error(f"[SEND EMAIL] ⚠️ Erreur lors de la création de la conversation: {e}", exc_info=True)
            # Ne pas faire échouer l'envoi si l'enregistrement dans l'inbox échoue
            try:
                db.rollback()
            except:
                pass
        
        # Créer une relance automatique pour le devis envoyé (seulement si le module relances est activé)
        try:
            # Vérifier si le module relances est activé dans les settings
            company_settings_obj = db.query(CompanySettings).filter(
                CompanySettings.company_id == current_user.company_id
            ).first()
            
            # Vérifier si les relances automatiques pour les devis sont activées
            should_create_followup = True
            if company_settings_obj and company_settings_obj.settings:
                # Vérifier d'abord si le module relances est activé
                modules = company_settings_obj.settings.get("modules", {})
                relances_module = modules.get("relances", {})
                if relances_module.get("enabled") is False:
                    should_create_followup = False
                    logger.info(f"[SEND EMAIL] ⏭️ Relances automatiques désactivées (module relances désactivé)")
                else:
                    # Si le module est activé, vérifier le paramètre spécifique pour les devis
                    billing_settings = company_settings_obj.settings.get("billing", {})
                    auto_followups = billing_settings.get("auto_followups", {})
                    quotes_enabled = auto_followups.get("quotes_enabled")
                    if quotes_enabled is False:
                        should_create_followup = False
                        logger.info(f"[SEND EMAIL] ⏭️ Relances automatiques pour les devis désactivées (paramètre billing.auto_followups.quotes_enabled = False)")
            
            if should_create_followup:
                create_automatic_followup_for_quote(db, quote, current_user.id)
                logger.info(f"[SEND EMAIL] ✅ Relance automatique créée pour le devis {quote.number}")
            else:
                logger.info(f"[SEND EMAIL] ⏭️ Relance automatique non créée (désactivée dans les paramètres)")
        except Exception as e:
            logger.error(f"[SEND EMAIL] ⚠️ Erreur lors de la création de la relance automatique: {e}", exc_info=True)
            # Ne pas faire échouer l'envoi si la relance échoue
        
        return {
            "success": True,
            "sent_count": sent_count,
            "total_recipients": len(recipients),
            "message": f"Email envoyé à {sent_count} destinataire(s) sur {len(recipients)}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SEND EMAIL] Erreur inattendue lors de l'envoi d'email: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de l'email: {str(e)}"
        )


@router.post("/{quote_id}/client-signature", response_model=QuoteRead)
async def upload_client_signature(
    quote_id: int,
    signature_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload la signature électronique du client pour un devis avec toutes les métadonnées de sécurité.
    Accepte une image base64 de la signature et enregistre toutes les informations nécessaires
    pour prouver l'intégrité et l'authenticité de la signature.
    """
    import logging
    logger = logging.getLogger(__name__)
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer le devis avec les relations nécessaires
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.company_id == current_user.company_id
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Vérifier si une signature existe déjà
    existing_signature = db.query(QuoteSignature).filter(
        QuoteSignature.quote_id == quote_id
    ).first()
    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quote already signed"
        )
    
    # Extraire les métadonnées de signature
    signature_base64 = signature_data.get("signature")
    signer_email = signature_data.get("signer_email", "").strip()
    signer_name = signature_data.get("signer_name", "").strip()
    consent_given = signature_data.get("consent_given", False)
    consent_text = signature_data.get("consent_text", "")
    
    if not signature_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature data is required"
        )
    
    if not signer_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signer email is required"
        )
    
    if not consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent must be given to sign"
        )
    
    # Capturer les informations de contexte
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Récupérer le client et l'entreprise pour générer le PDF
    client = get_client_info(db, quote.client_id, current_user.company_id)
    company = get_company_info(db, current_user.company_id)
    
    # SÉCURITÉ : Valider strictement que l'email correspond au client du devis
    if client.email and client.email.lower() != signer_email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"L'email du signataire ({signer_email}) ne correspond pas à l'email du client ({client.email}). Veuillez utiliser l'email du client pour signer ce devis."
        )
    
    if not client or not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client or company not found"
        )
    
    # Générer le PDF AVANT signature pour calculer le hash
    upload_dir = Path(settings.UPLOAD_DIR)
    temp_pdf_before = upload_dir / str(current_user.company_id) / "temp" / f"quote_{quote_id}_before_signature_{uuid.uuid4().hex[:8]}.pdf"
    temp_pdf_before.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        # Récupérer la configuration du design
        company_settings_obj = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        design_config = {}
        if company_settings_obj and company_settings_obj.settings:
            billing_design = company_settings_obj.settings.get("billing", {}).get("quote_design", {})
            design_config = {
                "primary_color": billing_design.get("primary_color", "#F97316"),
                "secondary_color": billing_design.get("secondary_color", "#F0F0F0"),
                "logo_path": billing_design.get("logo_path"),
                "signature_path": billing_design.get("signature_path"),
                "footer_text": billing_design.get("footer_text"),
                "terms_text": billing_design.get("terms_text")
            }
        
        # Générer PDF avant signature (sans signature client)
        generate_quote_pdf(quote, client, company, str(temp_pdf_before), design_config=design_config, client_signature_path=None)
        
        # Calculer le hash SHA-256 du PDF avant signature
        with open(temp_pdf_before, "rb") as f:
            pdf_content_before = f.read()
        document_hash_before = hashlib.sha256(pdf_content_before).hexdigest()
        
    except Exception as e:
        # Nettoyer le fichier temporaire en cas d'erreur
        if temp_pdf_before.exists():
            try:
                temp_pdf_before.unlink()
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF before signature: {str(e)}"
        )
    
    # Décoder l'image base64
    try:
        # Enlever le préfixe data:image/png;base64, si présent
        if "," in signature_base64:
            signature_base64 = signature_base64.split(",")[1]
        
        image_data = base64.b64decode(signature_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {str(e)}"
        )
    
    # Sauvegarder l'image de signature
    unique_filename = f"client_signature_{quote_id}_{uuid.uuid4().hex[:8]}.png"
    company_upload_dir = upload_dir / str(current_user.company_id) / "signatures"
    company_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = company_upload_dir / unique_filename
    
    # Supprimer l'ancienne signature si elle existe
    if quote.client_signature_path:
        old_file_path = upload_dir / quote.client_signature_path
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception:
                pass
    
    # Sauvegarder la nouvelle signature
    try:
        with open(file_path, "wb") as f:
            f.write(image_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving signature: {str(e)}"
        )
    
    # Mettre à jour le devis
    relative_path = f"{current_user.company_id}/signatures/{unique_filename}"
    quote.client_signature_path = relative_path
    
    # Générer le PDF APRÈS signature pour calculer le hash final
    temp_pdf_after = upload_dir / str(current_user.company_id) / "temp" / f"quote_{quote_id}_after_signature_{uuid.uuid4().hex[:8]}.pdf"
    signed_pdf_relative_path = None  # Initialiser pour éviter NameError
    signature_hash = None
    pdf_content_after = None
    
    try:
        generate_quote_pdf(quote, client, company, str(temp_pdf_after), design_config=design_config, client_signature_path=relative_path)
        
        # Calculer le hash SHA-256 du PDF après signature
        with open(temp_pdf_after, "rb") as f:
            pdf_content_after = f.read()
        signature_hash = hashlib.sha256(pdf_content_after).hexdigest()
        
        # SÉCURITÉ : Archiver le PDF signé de manière sécurisée
        archive_dir = upload_dir / str(current_user.company_id) / "signed_quotes"
        archive_dir.mkdir(parents=True, exist_ok=True)
        archived_pdf_path = archive_dir / f"quote_{quote_id}_signed_{uuid.uuid4().hex[:8]}.pdf"
        
        # Copier le PDF signé dans l'archive (ne pas supprimer)
        shutil.copy2(temp_pdf_after, archived_pdf_path)
        signed_pdf_relative_path = f"{current_user.company_id}/signed_quotes/{archived_pdf_path.name}"
        
        # Nettoyer uniquement le fichier temporaire avant signature
        if temp_pdf_before.exists():
            temp_pdf_before.unlink()
        # NE PAS supprimer temp_pdf_after car il est maintenant archivé
            
    except Exception as e:
        # Nettoyer les fichiers temporaires en cas d'erreur
        if temp_pdf_before.exists():
            try:
                temp_pdf_before.unlink()
            except:
                pass
        if temp_pdf_after.exists():
            try:
                temp_pdf_after.unlink()
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF after signature: {str(e)}"
        )
    
    # Vérifier que toutes les variables nécessaires sont définies
    if not signed_pdf_relative_path or not signature_hash or pdf_content_after is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: Failed to generate signed PDF"
        )
    
    # Si le devis n'était pas encore accepté, le marquer comme accepté
    signed_at = datetime.now(timezone.utc)
    was_accepted = quote.status == QuoteStatus.ACCEPTE
    if quote.status != QuoteStatus.ACCEPTE:
        quote.status = QuoteStatus.ACCEPTE
        quote.accepted_at = signed_at
        
        # Arrêter les relances automatiques pour ce devis
        try:
            from app.api.routes.followups import stop_followups_for_source
            stop_followups_for_source(db, "quote", quote_id, current_user.company_id)
        except Exception as e:
            convert_logger = logging.getLogger(__name__)
            convert_logger.error(f"Erreur lors de l'arrêt des relances pour le devis {quote_id}: {e}", exc_info=True)
    
    # Créer l'enregistrement de signature avec toutes les métadonnées
    quote_signature = QuoteSignature(
        quote_id=quote_id,
        signer_email=signer_email,
        signer_name=signer_name or None,
        signature_hash=signature_hash,
        document_hash_before_signature=document_hash_before,
        signed_pdf_path=signed_pdf_relative_path,  # Chemin vers le PDF archivé
        signed_at=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,  # Limiter à 500 caractères
        consent_given=consent_given,
        consent_text=consent_text or None,
        extra_metadata=json.dumps({
            "signature_image_size": len(image_data),
            "pdf_size_before": len(pdf_content_before),
            "pdf_size_after": len(pdf_content_after),
        }) if True else None
    )
    db.add(quote_signature)
    
    # Créer les entrées d'audit
    # 1. Événement de début de signature
    audit_start = QuoteSignatureAuditLog(
        quote_id=quote_id,
        event_type="signature_started",
        event_description=f"Signature électronique initiée par {signer_email}",
        user_email=signer_email,
        user_id=current_user.id if current_user else None,
        event_timestamp=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        extra_metadata=json.dumps({"consent_text": consent_text}) if consent_text else None
    )
    db.add(audit_start)
    
    # 2. Événement de signature complétée
    audit_complete = QuoteSignatureAuditLog(
        quote_id=quote_id,
        event_type="signature_completed",
        event_description=f"Signature électronique complétée par {signer_email}",
        user_email=signer_email,
        user_id=current_user.id if current_user else None,
        event_timestamp=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        extra_metadata=json.dumps({
            "signature_hash": signature_hash,
            "document_hash_before": document_hash_before,
        })
    )
    db.add(audit_complete)
    
    # Supprimer automatiquement les relances pour ce devis signé
    try:
        from app.db.models.followup import FollowUp, FollowUpType
        
        # Trouver toutes les relances pour ce devis (actives ou non)
        followups = db.query(FollowUp).filter(
            FollowUp.source_type == "quote",
            FollowUp.source_id == quote_id,
            FollowUp.type == FollowUpType.DEVIS_NON_REPONDU
        ).all()
        
        if followups:
            for followup in followups:
                db.delete(followup)
            logger.info(f"✅ {len(followups)} relance(s) automatiquement supprimée(s) pour le devis {quote.number} (ID: {quote_id})")
    except Exception as e:
        # Ne pas faire échouer la signature si la suppression des relances échoue
        logger.warning(f"Erreur lors de la suppression des relances pour le devis {quote_id}: {e}")
    
    # Créer une notification pour la signature du devis
    try:
        from app.core.notifications import create_notification
        from app.db.models.notification import NotificationType
        from app.core.config import settings
        
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
        create_notification(
            db=db,
            company_id=current_user.company_id,
            notification_type=NotificationType.QUOTE_SIGNED,
            title="Devis signé",
            message=f"Le devis {quote.number} a été signé par {signer_name or signer_email}",
            link_url=f"{frontend_url}/app/billing/quotes/{quote_id}",
            link_text="Voir le devis",
            source_type="quote",
            source_id=quote_id,
        )
        logger.info(f"✅ Notification créée pour la signature du devis {quote.number}")
    except Exception as e:
        # Ne pas faire échouer la signature si la création de notification échoue
        logger.warning(f"Erreur lors de la création de la notification pour le devis {quote_id}: {e}")
    
    db.commit()
    db.refresh(quote)
    
    return quote


# ============================================================================
# Endpoints publics pour la signature de devis
# ============================================================================

@router.get("/public/{token}", response_model=QuoteRead)
def get_public_quote(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Récupère un devis via son token public (sans authentification).
    Permet au client d'accéder à son devis pour le signer.
    """
    # Charger le devis avec ses lignes
    from sqlalchemy.orm import joinedload
    quote = db.query(Quote).options(joinedload(Quote.lines)).filter(Quote.public_token == token).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Récupérer le client et l'entreprise
    client = get_client_info(db, quote.client_id, quote.company_id)
    company = get_company_info(db, quote.company_id)
    
    if not client or not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client or company not found"
        )
    
    # Ajouter les noms et l'email du client (pour validation côté frontend)
    quote.client_name = client.name
    quote.client_email = client.email  # Pour validation côté frontend
    if quote.project_id:
        project = db.query(Project).filter(Project.id == quote.project_id).first()
        if project:
            quote.project_name = project.name
    
    # Enregistrer la consultation dans le journal d'audit
    try:
        audit_view = QuoteSignatureAuditLog(
            quote_id=quote.id,
            event_type="viewed",
            event_description=f"Devis consulté via lien public",
            user_email=None,
            user_id=None,
            event_timestamp=datetime.now(timezone.utc),
            ip_address=None,  # Sera rempli par le frontend si nécessaire
            user_agent=None,
            extra_metadata=None
        )
        db.add(audit_view)
        db.commit()
    except Exception:
        # Ne pas faire échouer la requête si l'audit échoue
        db.rollback()
        pass
    
    return quote


@router.post("/public/{token}/send-otp")
async def send_otp_for_signature(
    token: str,
    email_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Envoie un code OTP à l'email du client pour valider son identité avant la signature.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        email = email_data.get("email", "").strip().lower()
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        # Charger le devis
        from sqlalchemy.orm import joinedload
        quote = db.query(Quote).options(joinedload(Quote.lines)).filter(Quote.public_token == token).first()
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        # Vérifier l'expiration du token
        if quote.public_token_expires_at:
            # S'assurer que les deux datetimes sont timezone-aware
            expires_at = quote.public_token_expires_at
            if expires_at.tzinfo is None:
                # Si le datetime n'a pas de timezone, on suppose UTC
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if expires_at < now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Le lien de signature a expiré."
                )
        
        # Vérifier si une signature existe déjà
        existing_signature = db.query(QuoteSignature).filter(
            QuoteSignature.quote_id == quote.id
        ).first()
        if existing_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quote already signed"
            )
        
        # Récupérer le client et vérifier l'email
        client = get_client_info(db, quote.client_id, quote.company_id)
        company = get_company_info(db, quote.company_id)
        
        if not client or not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client or company not found"
            )
        
        # Valider que l'email correspond au client
        if client.email and client.email.lower().strip() != email:
            # Masquer partiellement l'email du client dans le message d'erreur
            def mask_email(email_str: str) -> str:
                if not email_str or len(email_str) < 5:
                    return email_str
                local, domain = email_str.split("@", 1)
                if len(local) <= 2:
                    return email_str
                return f"{local[:2]}....{local[-2:]}@{domain}"
            
            masked_client_email = mask_email(client.email)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"L'email saisi ne correspond pas à l'email du client ({masked_client_email}). Veuillez utiliser l'email du client pour signer ce devis."
            )
        
        # Générer un code OTP (6 chiffres)
        import random
        otp_code = f"{random.randint(100000, 999999)}"
        
        # Créer l'enregistrement OTP (expire dans 15 minutes)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        # Invalider les anciens codes OTP pour ce devis et cet email
        try:
            old_otps = db.query(QuoteOTP).filter(
                QuoteOTP.quote_id == quote.id,
                QuoteOTP.email == email,
                QuoteOTP.verified == False
            ).all()
            for old_otp in old_otps:
                old_otp.verified = True  # Marquer comme vérifiés (invalides)
        except Exception as e:
            logger.warning(f"Erreur lors de l'invalidation des anciens OTP pour le devis {quote.id}: {str(e)}")
            # Continuer même si l'invalidation échoue
        
        otp = QuoteOTP(
            quote_id=quote.id,
            email=email,
            code=otp_code,
            expires_at=expires_at,
            verified=False
        )
        db.add(otp)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Erreur lors de la sauvegarde de l'OTP pour le devis {quote.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la création du code OTP: {str(e)}"
            )
        
        # Envoyer l'email avec le code OTP
        try:
            # Essayer d'abord d'utiliser l'intégration inbox principale
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == quote.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            
            email_from = None
            email_password = None
            
            if primary_integration and primary_integration.email_address and primary_integration.email_password:
                # Utiliser l'intégration inbox
                email_from = primary_integration.email_address
                email_password = primary_integration.email_password
                logger.info(f"Utilisation de l'intégration inbox principale: {email_from}")
            else:
                # Fallback: utiliser les settings de l'entreprise
                company_settings_obj = db.query(CompanySettings).filter(
                    CompanySettings.company_id == quote.company_id
                ).first()
                
                if company_settings_obj and company_settings_obj.settings:
                    integrations = company_settings_obj.settings.get("integrations", {})
                    email_password = integrations.get("email_provider")
                    email_from = integrations.get("email_from")
            
            if email_from and email_password:
                smtp_config = get_smtp_config(email_from)
                
                subject = f"Code de validation - Signature du devis {quote.number}"
                content = f"""Bonjour,

Vous avez demandé à signer le devis {quote.number}.

Votre code de validation est : {otp_code}

Ce code est valide pendant 15 minutes.

Si vous n'avez pas demandé ce code, veuillez ignorer cet email.

Cordialement,
L'équipe {company.name}
"""
                
                send_email_smtp(
                    smtp_server=smtp_config["smtp_server"],
                    smtp_port=smtp_config["smtp_port"],
                    email_address=email_from,
                    password=email_password,
                    to_email=email,
                    subject=subject,
                    content=content,
                    use_tls=smtp_config["use_tls"],
                    from_name=company.name
                )
            else:
                logger.warning(f"Configuration email manquante pour l'entreprise {quote.company_id}. Impossible d'envoyer l'OTP.")
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'OTP pour le devis {quote.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            # Ne pas faire échouer la requête si l'email échoue, mais logger l'erreur
        
        return {"message": "Code OTP envoyé avec succès", "expires_in_minutes": 15}
    
    except HTTPException:
        # Re-raise les HTTPException (erreurs 400, 403, 404, etc.)
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue dans send_otp_for_signature: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi du code OTP: {str(e)}"
        )


@router.post("/public/{token}/verify-otp")
async def verify_otp_for_signature(
    token: str,
    otp_data: dict,
    db: Session = Depends(get_db)
):
    """
    Vérifie le code OTP avant de permettre la signature.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        email = otp_data.get("email", "").strip().lower()
        code = otp_data.get("code", "").strip()
        
        if not email or not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and code are required"
            )
        
        # Charger le devis
        quote = db.query(Quote).filter(Quote.public_token == token).first()
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        # Trouver le code OTP valide
        otp = db.query(QuoteOTP).filter(
            QuoteOTP.quote_id == quote.id,
            QuoteOTP.email == email,
            QuoteOTP.code == code,
            QuoteOTP.verified == False
        ).order_by(QuoteOTP.created_at.desc()).first()
        
        if not otp:
            logger.warning(f"OTP non trouvé pour quote_id={quote.id}, email={email}, code={code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code OTP invalide ou expiré"
            )
        
        if not otp.is_valid():
            logger.warning(f"OTP invalide pour quote_id={quote.id}, email={email}, verified={otp.verified}, expires_at={otp.expires_at}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code OTP invalide ou expiré"
            )
        
        # Marquer le code comme vérifié
        if not otp.verify():
            logger.error(f"Échec de la vérification de l'OTP pour quote_id={quote.id}, email={email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de vérifier le code OTP"
            )
        
        db.commit()
        logger.info(f"OTP vérifié avec succès pour quote_id={quote.id}, email={email}")
        
        return {"message": "Code OTP validé avec succès", "verified": True}
    
    except HTTPException:
        # Re-raise les HTTPException (erreurs 400, 403, 404, etc.)
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue dans verify_otp_for_signature: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la vérification du code OTP: {str(e)}"
        )


@router.post("/public/{token}/signature", response_model=QuoteRead)
async def sign_public_quote(
    token: str,
    signature_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Permet au client de signer un devis via son token public (sans authentification).
    Nécessite que le code OTP ait été validé au préalable.
    Enregistre toutes les métadonnées de signature sécurisée.
    """
    # Charger le devis avec ses lignes
    from sqlalchemy.orm import joinedload
    quote = db.query(Quote).options(joinedload(Quote.lines)).filter(Quote.public_token == token).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # SÉCURITÉ : Vérifier l'expiration du token
    if quote.public_token_expires_at:
        # S'assurer que les deux datetimes sont timezone-aware
        expires_at = quote.public_token_expires_at
        if expires_at.tzinfo is None:
            # Si le datetime n'a pas de timezone, on suppose UTC
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Le lien de signature a expiré. Veuillez demander un nouveau lien à l'entreprise."
            )
    
    # Vérifier si une signature existe déjà
    existing_signature = db.query(QuoteSignature).filter(
        QuoteSignature.quote_id == quote.id
    ).first()
    if existing_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quote already signed"
        )
    
    # Extraire les métadonnées de signature
    signature_base64 = signature_data.get("signature")
    signer_email = signature_data.get("signer_email", "").strip()
    signer_name = signature_data.get("signer_name", "").strip()
    consent_given = signature_data.get("consent_given", False)
    consent_text = signature_data.get("consent_text", "")
    
    if not signature_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature data is required"
        )
    
    if not signer_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signer email is required"
        )
    
    if not consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent must be given to sign"
        )
    
    # Capturer les informations de contexte
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Récupérer le client et l'entreprise
    client = get_client_info(db, quote.client_id, quote.company_id)
    company = get_company_info(db, quote.company_id)
    
    if not client or not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client or company not found"
        )
    
    # Générer le PDF AVANT signature pour calculer le hash
    upload_dir = Path(settings.UPLOAD_DIR)
    temp_pdf_before = upload_dir / str(quote.company_id) / "temp" / f"quote_{quote.id}_before_signature_{uuid.uuid4().hex[:8]}.pdf"
    temp_pdf_before.parent.mkdir(parents=True, exist_ok=True)
    
    # Initialiser les variables pour éviter NameError
    pdf_content_before = None
    document_hash_before = None
    design_config = {}
    
    try:
        # Récupérer la configuration du design
        company_settings_obj = db.query(CompanySettings).filter(
            CompanySettings.company_id == quote.company_id
        ).first()
        
        if company_settings_obj and company_settings_obj.settings:
            billing_design = company_settings_obj.settings.get("billing", {}).get("quote_design", {})
            design_config = {
                "primary_color": billing_design.get("primary_color", "#F97316"),
                "secondary_color": billing_design.get("secondary_color", "#F0F0F0"),
                "logo_path": billing_design.get("logo_path"),
                "signature_path": billing_design.get("signature_path"),
                "footer_text": billing_design.get("footer_text"),
                "terms_text": billing_design.get("terms_text")
            }
        
        # Générer PDF avant signature (sans signature client)
        generate_quote_pdf(quote, client, company, str(temp_pdf_before), design_config=design_config, client_signature_path=None)
        
        # Calculer le hash SHA-256 du PDF avant signature
        with open(temp_pdf_before, "rb") as f:
            pdf_content_before = f.read()
        document_hash_before = hashlib.sha256(pdf_content_before).hexdigest()
        
    except Exception as e:
        # Nettoyer le fichier temporaire en cas d'erreur
        if temp_pdf_before.exists():
            try:
                temp_pdf_before.unlink()
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF before signature: {str(e)}"
        )
    
    # Vérifier que les variables sont définies
    if pdf_content_before is None or document_hash_before is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: Failed to generate PDF before signature"
        )
    
    # Décoder l'image base64
    try:
        # Enlever le préfixe data:image/png;base64, si présent
        if "," in signature_base64:
            signature_base64 = signature_base64.split(",")[1]
        
        image_data = base64.b64decode(signature_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {str(e)}"
        )
    
    # Sauvegarder l'image de signature
    unique_filename = f"client_signature_{quote.id}_{uuid.uuid4().hex[:8]}.png"
    company_upload_dir = upload_dir / str(quote.company_id) / "signatures"
    company_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = company_upload_dir / unique_filename
    
    # Supprimer l'ancienne signature si elle existe
    if quote.client_signature_path:
        old_file_path = upload_dir / quote.client_signature_path
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception:
                pass
    
    # Sauvegarder la nouvelle signature
    try:
        with open(file_path, "wb") as f:
            f.write(image_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving signature: {str(e)}"
        )
    
    # Mettre à jour le devis
    relative_path = f"{quote.company_id}/signatures/{unique_filename}"
    quote.client_signature_path = relative_path
    
    # Générer le PDF APRÈS signature pour calculer le hash final
    temp_pdf_after = upload_dir / str(quote.company_id) / "temp" / f"quote_{quote.id}_after_signature_{uuid.uuid4().hex[:8]}.pdf"
    signed_pdf_relative_path = None  # Initialiser pour éviter NameError
    signature_hash = None
    pdf_content_after = None
    
    try:
        generate_quote_pdf(quote, client, company, str(temp_pdf_after), design_config=design_config, client_signature_path=relative_path)
        
        # Calculer le hash SHA-256 du PDF après signature
        with open(temp_pdf_after, "rb") as f:
            pdf_content_after = f.read()
        signature_hash = hashlib.sha256(pdf_content_after).hexdigest()
        
        # SÉCURITÉ : Archiver le PDF signé de manière sécurisée
        archive_dir = upload_dir / str(quote.company_id) / "signed_quotes"
        archive_dir.mkdir(parents=True, exist_ok=True)
        archived_pdf_path = archive_dir / f"quote_{quote.id}_signed_{uuid.uuid4().hex[:8]}.pdf"
        
        # Copier le PDF signé dans l'archive (ne pas supprimer)
        shutil.copy2(temp_pdf_after, archived_pdf_path)
        signed_pdf_relative_path = f"{quote.company_id}/signed_quotes/{archived_pdf_path.name}"
        
        # Nettoyer uniquement le fichier temporaire avant signature
        if temp_pdf_before.exists():
            temp_pdf_before.unlink()
        # NE PAS supprimer temp_pdf_after car il est maintenant archivé
            
    except Exception as e:
        # Nettoyer les fichiers temporaires en cas d'erreur
        if temp_pdf_before.exists():
            try:
                temp_pdf_before.unlink()
            except:
                pass
        if temp_pdf_after.exists():
            try:
                temp_pdf_after.unlink()
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF after signature: {str(e)}"
        )
    
    # Vérifier que toutes les variables nécessaires sont définies
    if not signed_pdf_relative_path or not signature_hash or pdf_content_after is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: Failed to generate signed PDF"
        )
    
    # Si le devis n'était pas encore accepté, le marquer comme accepté
    signed_at = datetime.now(timezone.utc)
    was_accepted = quote.status == QuoteStatus.ACCEPTE
    if quote.status != QuoteStatus.ACCEPTE:
        quote.status = QuoteStatus.ACCEPTE
        quote.accepted_at = signed_at
        
        # Arrêter les relances automatiques pour ce devis
        try:
            from app.api.routes.followups import stop_followups_for_source
            stop_followups_for_source(db, "quote", quote.id, quote.company_id)
        except Exception as e:
            logger.error(f"Erreur lors de l'arrêt des relances pour le devis {quote.id}: {e}", exc_info=True)
    
    # Créer l'enregistrement de signature avec toutes les métadonnées
    quote_signature = QuoteSignature(
        quote_id=quote.id,
        signer_email=signer_email,
        signer_name=signer_name or None,
        signature_hash=signature_hash,
        document_hash_before_signature=document_hash_before,
        signed_pdf_path=signed_pdf_relative_path,  # Chemin vers le PDF archivé
        signed_at=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        consent_given=consent_given,
        consent_text=consent_text or None,
        extra_metadata=json.dumps({
            "signature_image_size": len(image_data),
            "pdf_size_before": len(pdf_content_before) if pdf_content_before else 0,
            "pdf_size_after": len(pdf_content_after) if pdf_content_after else 0,
        }) if True else None
    )
    db.add(quote_signature)
    
    # Créer les entrées d'audit
    # 1. Événement de début de signature
    audit_start = QuoteSignatureAuditLog(
        quote_id=quote.id,
        event_type="signature_started",
        event_description=f"Signature électronique initiée par {signer_email} (via lien public)",
        user_email=signer_email,
        user_id=None,  # Pas d'utilisateur connecté
        event_timestamp=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        extra_metadata=json.dumps({"consent_text": consent_text}) if consent_text else None
    )
    db.add(audit_start)
    
    # 2. Événement de signature complétée
    audit_complete = QuoteSignatureAuditLog(
        quote_id=quote.id,
        event_type="signature_completed",
        event_description=f"Signature électronique complétée par {signer_email} (via lien public)",
        user_email=signer_email,
        user_id=None,  # Pas d'utilisateur connecté
        event_timestamp=signed_at,
        ip_address=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        extra_metadata=json.dumps({
            "signature_hash": signature_hash,
            "document_hash_before": document_hash_before,
        })
    )
    db.add(audit_complete)
    
    db.commit()
    db.refresh(quote)
    
    # Envoyer un email de confirmation au client qui a signé
    try:
        # Essayer d'abord d'utiliser l'intégration inbox principale
        primary_integration = db.query(InboxIntegration).filter(
            InboxIntegration.company_id == quote.company_id,
            InboxIntegration.is_primary == True,
            InboxIntegration.is_active == True,
            InboxIntegration.integration_type == "imap"
        ).first()
        
        email_from = None
        email_password = None
        
        if primary_integration and primary_integration.email_address and primary_integration.email_password:
            # Utiliser l'intégration inbox
            email_from = primary_integration.email_address
            email_password = primary_integration.email_password
        else:
            # Fallback: utiliser les settings de l'entreprise
            company_settings_obj = db.query(CompanySettings).filter(
                CompanySettings.company_id == quote.company_id
            ).first()
            
            if company_settings_obj and company_settings_obj.settings:
                integrations = company_settings_obj.settings.get("integrations", {})
                email_password = integrations.get("email_provider")
                email_from = integrations.get("email_from")
        
        if email_from and email_password:
            smtp_config = get_smtp_config(email_from)
            
            subject = f"Confirmation de signature - Devis {quote.number}"
            content = f"""Bonjour {signer_name or signer_email},

Votre signature électronique du devis {quote.number} a été enregistrée avec succès.

Détails du devis :
- Numéro : {quote.number}
- Date de signature : {signed_at.strftime('%d/%m/%Y à %H:%M')}
- Montant total : {quote.total_ttc or quote.amount:.2f} €

Cette signature électronique a la même valeur légale qu'une signature manuscrite.

Vous pouvez télécharger une copie du devis signé depuis votre espace client ou en contactant directement {company.name}.

Cordialement,
L'équipe {company.name}
"""
            
            send_email_smtp(
                smtp_server=smtp_config["smtp_server"],
                smtp_port=smtp_config["smtp_port"],
                email_address=email_from,
                password=email_password,
                to_email=signer_email,
                subject=subject,
                content=content,
                use_tls=smtp_config["use_tls"],
                from_name=company.name
            )
            
            # Logger l'envoi dans l'audit
            audit_email = QuoteSignatureAuditLog(
                quote_id=quote.id,
                event_type="confirmation_email_sent",
                event_description=f"Email de confirmation envoyé à {signer_email}",
                user_email=signer_email,
                user_id=None,
                event_timestamp=datetime.now(timezone.utc),
                ip_address=client_ip,
                user_agent=user_agent[:500] if user_agent else None,
                extra_metadata=None
            )
            db.add(audit_email)
            db.commit()
            
    except Exception as e:
        # Ne pas faire échouer la signature si l'email échoue
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de l'envoi de l'email de confirmation pour la signature du devis {quote.id}: {str(e)}")
        # Ne pas lever d'exception, juste logger l'erreur
    
    return quote
