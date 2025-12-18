from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Body
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
import logging

from app.db.session import get_db
from app.db.models.billing import Invoice, InvoiceLine, InvoiceStatus, InvoiceType, InvoicePayment, Quote
from app.db.models.client import Client
from app.db.models.company import Company
from app.api.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceRead, InvoiceLineCreate,
    CreditNoteCreate, InvoiceAuditLogRead, RelatedDocumentsResponse
)
from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.core.invoice_service import (
    generate_invoice_number, validate_invoice_totals, calculate_line_totals,
    can_modify_invoice, can_delete_invoice, recalculate_invoice_totals,
    validate_tax_rate, get_valid_tax_rates
)
from app.core.invoice_audit_service import (
    log_invoice_creation, log_invoice_update, log_status_change,
    log_invoice_deletion, log_invoice_archival, log_credit_note_creation
)
from app.core.invoice_pdf_service import generate_invoice_pdf
from app.db.models.invoice_audit import InvoiceAuditLog

router = APIRouter(prefix="/invoices", tags=["invoices"])


def get_company_info(db: Session, company_id: int) -> Optional[Company]:
    """Récupère les informations de l'entreprise."""
    return db.query(Company).filter(Company.id == company_id).first()


def get_client_info(db: Session, client_id: int, company_id: int) -> Optional[Client]:
    """Récupère les informations du client."""
    return db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == company_id
    ).first()


def populate_seller_info(invoice: Invoice, company: Company, db: Session):
    """Remplit les informations vendeur depuis l'entreprise."""
    # TODO: Récupérer depuis CompanySettings si disponible
    # Pour l'instant, on utilise des valeurs par défaut
    if not invoice.seller_name:
        invoice.seller_name = company.name
    # Les autres champs (SIREN, SIRET, etc.) devront être remplis manuellement
    # ou depuis les paramètres de l'entreprise


def populate_client_info(invoice: Invoice, client: Client):
    """Remplit les informations client depuis le modèle Client."""
    if not invoice.client_name:
        invoice.client_name = client.name
    if not invoice.client_address:
        invoice.client_address = client.address
    # client_siren devra être ajouté au modèle Client ou saisi manuellement


def create_automatic_followup_for_invoice(db: Session, invoice: Invoice, user_id: int):
    """
    Crée automatiquement une relance pour une facture impayée.
    Vérifie d'abord si les relances automatiques sont activées dans les settings.
    """
    try:
        # Vérifier si les relances automatiques sont activées
        from app.db.models.company_settings import CompanySettings
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == invoice.company_id
        ).first()
        
        # Vérifier si les relances automatiques pour les factures sont activées
        should_create = True
        if company_settings and company_settings.settings:
            # Vérifier d'abord si le module relances est activé
            modules = company_settings.settings.get("modules", {})
            relances_module = modules.get("relances", {})
            relances_enabled = relances_module.get("enabled", True)  # Par défaut True si non défini
            
            logger.info(f"[FOLLOWUP AUTO] Module relances enabled: {relances_enabled}")
            
            if relances_enabled is False:
                should_create = False
                logger.info(f"[FOLLOWUP AUTO] Relances automatiques désactivées (module relances désactivé)")
            else:
                # Si le module est activé, vérifier le paramètre spécifique pour les factures
                billing_settings = company_settings.settings.get("billing", {})
                auto_followups = billing_settings.get("auto_followups", {})
                invoices_enabled = auto_followups.get("invoices_enabled")
                
                logger.info(f"[FOLLOWUP AUTO] billing.auto_followups.invoices_enabled: {invoices_enabled}")
                
                # Si le paramètre est explicitement défini à False, ne pas créer
                if invoices_enabled is False:
                    should_create = False
                    logger.info(f"[FOLLOWUP AUTO] Relances automatiques pour les factures désactivées (paramètre billing.auto_followups.invoices_enabled = False)")
                # Si le paramètre n'est pas défini (None) ou est True, créer la relance
                else:
                    logger.info(f"[FOLLOWUP AUTO] Relances automatiques activées pour les factures (paramètre: {invoices_enabled})")
        
        if not should_create:
            logger.info(f"[FOLLOWUP AUTO] ⏭️ Relance automatique NON créée pour la facture {invoice.number} (should_create={should_create})")
            return
        
        logger.info(f"[FOLLOWUP AUTO] ✅ Création de la relance automatique pour la facture {invoice.number}")
        # Vérifier si une relance existe déjà pour cette facture
        from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus
        from datetime import timedelta
        
        existing_followup = db.query(FollowUp).filter(
            FollowUp.source_type == "invoice",
            FollowUp.source_id == invoice.id,
            FollowUp.type == FollowUpType.FACTURE_IMPAYEE
        ).first()
        
        if existing_followup:
            logger.info(f"[FOLLOWUP AUTO] Relance déjà existante pour la facture {invoice.number} (ID: {invoice.id})")
            return
        
        # Récupérer les paramètres de relance automatique
        from app.db.models.company_settings import CompanySettings
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == invoice.company_id
        ).first()
        
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
            company_id=invoice.company_id,
            client_id=invoice.client_id,
            type=FollowUpType.FACTURE_IMPAYEE,
            source_type="invoice",
            source_id=invoice.id,
            source_label=f"Facture {invoice.number}",
            due_date=due_date,
            actual_date=due_date,
            status=FollowUpStatus.A_FAIRE,
            amount=invoice.total_ttc or invoice.amount,
            auto_enabled=True,
            auto_frequency_days=initial_delay_days,
            auto_stop_on_response=True,
            auto_stop_on_paid=True,
            auto_stop_on_refused=False,  # Les factures ne sont pas "refusées"
            created_by_id=user_id
        )
        
        db.add(followup)
        db.commit()
        logger.info(f"[FOLLOWUP AUTO] ✅ Relance automatique créée pour la facture {invoice.number} (ID: {invoice.id}) - Due: {due_date.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        logger.error(f"[FOLLOWUP AUTO] ❌ Erreur lors de la création de la relance automatique pour la facture {invoice.id}: {e}", exc_info=True)
        # Ne pas faire échouer la création de la facture si la relance échoue


@router.get("", response_model=List[InvoiceRead])
def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filtrer par statut"),
    client_id: Optional[int] = Query(None, description="Filtrer par client"),
    search: Optional[str] = Query(None, description="Recherche par numéro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère la liste des factures de l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Base query : filtrer par company_id et exclure les supprimées
    query = db.query(Invoice).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    )
    
    # Filtre par statut
    if status_filter:
        try:
            status_enum = InvoiceStatus(status_filter)
            query = query.filter(Invoice.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Statut invalide: {status_filter}"
            )
    
    # Filtre par client
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    
    # Recherche par numéro
    if search:
        search_term = f"%{search}%"
        query = query.filter(Invoice.number.ilike(search_term))
    
    # Pagination - Charger les lignes avec joinedload
    invoices = query.options(joinedload(Invoice.lines)).order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    # Préparer les données pour la réponse
    company = get_company_info(db, current_user.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    result = []
    for invoice in invoices:
        # Récupérer les informations du client
        client = get_client_info(db, invoice.client_id, current_user.company_id)
        
        # Remplir les informations vendeur
        populate_seller_info(invoice, company, db)
        
        # Ajouter les informations du client
        if client:
            invoice.client_name = client.name
            invoice.client_address = client.address
        
        # Calculer le montant payé et restant
        total_invoice = invoice.total_ttc or invoice.amount
        total_paid = db.query(func.sum(InvoicePayment.amount)).filter(
            InvoicePayment.invoice_id == invoice.id
        ).scalar() or Decimal('0')
        
        # Calculer le montant déjà crédité (somme des avoirs existants)
        total_credited = db.query(func.sum(Invoice.credit_amount)).filter(
            Invoice.original_invoice_id == invoice.id,
            Invoice.deleted_at.is_(None)
        ).scalar() or Decimal('0')
        
        invoice.amount_paid = total_paid
        invoice.amount_remaining = total_invoice - total_paid
        # Montant restant créditable (total - avoirs déjà créés)
        invoice.credit_remaining = total_invoice - total_credited
        
        result.append(invoice)
    
    return result


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère une facture spécifique par son ID.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).options(joinedload(Invoice.lines)).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Remplir les informations client et vendeur
    company = get_company_info(db, current_user.company_id)
    if company:
        populate_seller_info(invoice, company, db)
    
    client = get_client_info(db, invoice.client_id, current_user.company_id)
    if client:
        invoice.client_name = client.name
        invoice.client_address = client.address
    
    # Calculer le montant payé et restant
    total_invoice = invoice.total_ttc or invoice.amount
    total_paid = db.query(func.sum(InvoicePayment.amount)).filter(
        InvoicePayment.invoice_id == invoice_id
    ).scalar() or Decimal('0')
    
    # Calculer le montant déjà crédité (somme des avoirs existants)
    total_credited = db.query(func.sum(Invoice.credit_amount)).filter(
        Invoice.original_invoice_id == invoice_id,
        Invoice.deleted_at.is_(None)
    ).scalar() or Decimal('0')
    
    invoice.amount_paid = total_paid
    invoice.amount_remaining = total_invoice - total_paid
    # Montant restant créditable (total - avoirs déjà créés)
    invoice.credit_remaining = total_invoice - total_credited
    
    return invoice


@router.post("", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_data: InvoiceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée une nouvelle facture.
    Génère automatiquement le numéro séquentiel.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que le client existe et appartient à l'entreprise
    client = get_client_info(db, invoice_data.client_id, current_user.company_id)
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
    
    # Déterminer le type de facture
    invoice_type = InvoiceType(invoice_data.invoice_type) if invoice_data.invoice_type else InvoiceType.FACTURE
    
    # Générer le numéro de facture
    number = generate_invoice_number(db, current_user.company_id, invoice_type)
    
    # Créer la facture
    invoice = Invoice(
        company_id=current_user.company_id,
        client_id=invoice_data.client_id,
        project_id=invoice_data.project_id,
        quote_id=invoice_data.quote_id,
        number=number,
        invoice_type=invoice_type,
        original_invoice_id=invoice_data.original_invoice_id,
        credit_amount=invoice_data.credit_amount,
        status=InvoiceStatus.IMPAYEE,
        
        # Informations vendeur
        seller_name=invoice_data.seller_name,
        seller_address=invoice_data.seller_address,
        seller_siren=invoice_data.seller_siren,
        seller_siret=invoice_data.seller_siret,
        seller_vat_number=invoice_data.seller_vat_number,
        seller_rcs=invoice_data.seller_rcs,
        seller_legal_form=invoice_data.seller_legal_form,
        seller_capital=invoice_data.seller_capital,
        
        # Informations client
        client_name=invoice_data.client_name,
        client_address=invoice_data.client_address,
        client_siren=invoice_data.client_siren,
        client_delivery_address=invoice_data.client_delivery_address,
        
        # Dates
        issue_date=invoice_data.issue_date or datetime.now(timezone.utc),
        sale_date=invoice_data.sale_date,
        due_date=invoice_data.due_date,
        
        # Conditions
        payment_terms=invoice_data.payment_terms,
        late_penalty_rate=invoice_data.late_penalty_rate,
        recovery_fee=invoice_data.recovery_fee,
        
        # Mentions spéciales
        vat_on_debit=invoice_data.vat_on_debit,
        vat_exemption_reference=invoice_data.vat_exemption_reference,
        operation_category=invoice_data.operation_category,
        vat_applicable=invoice_data.vat_applicable,
        
        # Notes
        notes=invoice_data.notes,
        conditions=invoice_data.conditions,
    )
    
    # Récupérer les settings de l'entreprise pour les taux de TVA
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    
    # Remplir les informations depuis l'entreprise et le client si manquantes
    populate_seller_info(invoice, company, db)
    populate_client_info(invoice, client)
    
    # Vérifier si l'ENTREPRISE est auto-entrepreneur ou exonérée de TVA
    # Si oui, appliquer automatiquement les règles TVA
    if company.is_auto_entrepreneur or company.vat_exempt:
        invoice.vat_applicable = False
        if company.vat_exemption_reference:
            invoice.vat_exemption_reference = company.vat_exemption_reference
        elif company.is_auto_entrepreneur:
            # Mention légale par défaut pour auto-entrepreneurs
            invoice.vat_exemption_reference = "TVA non applicable, art. 293 B du CGI"
    
    db.add(invoice)
    db.flush()  # Pour obtenir l'ID
    
    # Récupérer les taux de TVA autorisés
    valid_tax_rates = get_valid_tax_rates(company_settings)
    
    # Créer les lignes de facture
    for idx, line_data in enumerate(invoice_data.lines):
        # Si ENTREPRISE auto-entrepreneur ou exonérée, forcer le taux TVA à 0
        if company.is_auto_entrepreneur or company.vat_exempt:
            tax_rate = Decimal('0')
        else:
            tax_rate = Decimal(str(line_data.tax_rate))
        
        # Valider le taux de TVA (sauf si forcé à 0 pour auto-entrepreneur)
        if tax_rate != Decimal('0') and not validate_tax_rate(tax_rate, company_settings):
            valid_rates_str = ", ".join([str(rate) for rate in valid_tax_rates])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Taux de TVA invalide: {tax_rate}. Taux autorisés: {valid_rates_str}"
            )
        
        # Calculer les totaux de la ligne
        quantity = Decimal(str(line_data.quantity))
        unit_price = Decimal(str(line_data.unit_price_ht))
        totals = calculate_line_totals(quantity, unit_price, tax_rate)
        
        line = InvoiceLine(
            invoice_id=invoice.id,
            description=line_data.description,
            quantity=quantity,
            unit=line_data.unit,
            unit_price_ht=unit_price,
            tax_rate=tax_rate,
            subtotal_ht=totals['subtotal_ht'],
            tax_amount=totals['tax_amount'],
            total_ttc=totals['total_ttc'],
            order=idx
        )
        db.add(line)
    
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
    log_invoice_creation(db, invoice.id, current_user.id, request)
    
    # Créer une relance automatique pour la facture impayée
    logger.info(f"[INVOICE CREATE] Statut de la facture créée: {invoice.status}")
    if invoice.status == InvoiceStatus.IMPAYEE:
        logger.info(f"[INVOICE CREATE] ✅ Statut IMPAYEE détecté, tentative de création de relance automatique pour la facture {invoice.number}")
        try:
            create_automatic_followup_for_invoice(db, invoice, current_user.id)
        except Exception as e:
            logger.error(f"[INVOICE CREATE] ❌ Erreur lors de la création de la relance automatique: {e}", exc_info=True)
            # Ne pas faire échouer la création de la facture si la relance échoue
    else:
        logger.info(f"[INVOICE CREATE] ⏭️ Statut de la facture n'est pas IMPAYEE ({invoice.status}), pas de relance automatique créée")
    
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour une facture.
    Uniquement possible si la facture est en statut "brouillon".
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # VÉRIFICATION CRITIQUE : Seules les factures en brouillon peuvent être modifiées
    if not can_modify_invoice(invoice):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Impossible de modifier une facture avec le statut '{invoice.status.value}'. "
                   f"Créez un avoir pour corriger une facture validée."
        )
    
    # Suivre les changements pour l'audit log
    changes = {}
    
    # Mettre à jour les champs de base
    update_dict = invoice_data.model_dump(exclude_unset=True, exclude={'lines'})
    for field, new_value in update_dict.items():
        old_value = getattr(invoice, field, None)
        if old_value != new_value:
            changes[field] = (old_value, new_value)
            setattr(invoice, field, new_value)
    
    # Récupérer les settings de l'entreprise pour les taux de TVA
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    valid_tax_rates = get_valid_tax_rates(company_settings)
    
    # Récupérer l'entreprise pour vérifier si elle est auto-entrepreneur
    company = get_company_info(db, current_user.company_id)
    
    # Mettre à jour les lignes si fournies
    if invoice_data.lines is not None:
        # Supprimer les anciennes lignes
        db.query(InvoiceLine).filter(InvoiceLine.invoice_id == invoice.id).delete()
        
        # Créer les nouvelles lignes
        for idx, line_data in enumerate(invoice_data.lines):
            # Si ENTREPRISE auto-entrepreneur ou exonérée, forcer le taux TVA à 0
            if company and (company.is_auto_entrepreneur or company.vat_exempt):
                tax_rate = Decimal('0')
            else:
                tax_rate = Decimal(str(line_data.tax_rate))
            
            # Valider le taux de TVA (sauf si forcé à 0 pour auto-entrepreneur)
            if tax_rate != Decimal('0') and not validate_tax_rate(tax_rate, company_settings):
                valid_rates_str = ", ".join([str(rate) for rate in valid_tax_rates])
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Taux de TVA invalide: {tax_rate}. Taux autorisés: {valid_rates_str}"
                )
            
            # Calculer les totaux
            quantity = Decimal(str(line_data.quantity))
            unit_price = Decimal(str(line_data.unit_price_ht))
            totals = calculate_line_totals(quantity, unit_price, tax_rate)
            
            line = InvoiceLine(
                invoice_id=invoice.id,
                description=line_data.description,
                quantity=quantity,
                unit=line_data.unit,
                unit_price_ht=unit_price,
                tax_rate=tax_rate,
                subtotal_ht=totals['subtotal_ht'],
                tax_amount=totals['tax_amount'],
                total_ttc=totals['total_ttc'],
                order=idx
            )
            db.add(line)
        
        changes['lines'] = ("[lignes modifiées]", f"{len(invoice_data.lines)} ligne(s)")
    
    # Recalculer les totaux
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
    
    # Logger les modifications
    if changes:
        log_invoice_update(db, invoice.id, current_user.id, changes, request)
    
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime une facture (soft delete).
    Uniquement possible si la facture est en statut "brouillon".
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # VÉRIFICATION CRITIQUE : Seules les factures en brouillon peuvent être supprimées
    if not can_delete_invoice(invoice):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Impossible de supprimer une facture avec le statut '{invoice.status.value}'. "
                   f"Créez un avoir à la place."
        )
    
    # Soft delete
    invoice.deleted_at = datetime.now(timezone.utc)
    invoice.deleted_by_id = current_user.id
    
    db.commit()
    
    # Logger la suppression
    log_invoice_deletion(db, invoice.id, current_user.id, request)
    
    return


@router.post("/{invoice_id}/validate", response_model=InvoiceRead)
def validate_invoice(
    invoice_id: int,
    new_status: str = Query(..., description="Nouveau statut: 'envoyée', 'payée', etc."),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Valide une facture (change le statut de brouillon à envoyée).
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Vérifier que la facture est impayée (pas payée)
    if invoice.status == InvoiceStatus.PAYEE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Les factures payées ne peuvent pas être modifiées. Statut actuel: {invoice.status.value}"
        )
    
    # Valider le nouveau statut
    try:
        new_status_enum = InvoiceStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Statut invalide: {new_status}"
        )
    
    old_status = invoice.status.value
    invoice.status = new_status_enum
    
    # Si le statut est "envoyée", mettre à jour sent_at
    if new_status_enum == InvoiceStatus.ENVOYEE:
        invoice.sent_at = datetime.now(timezone.utc)
    
    # Si le statut est "payée", mettre à jour paid_at
    was_paid = invoice.status == InvoiceStatus.PAYEE
    if new_status_enum == InvoiceStatus.PAYEE:
        invoice.paid_at = datetime.now(timezone.utc)
        
        # Créer une notification si la facture vient d'être payée
        if not was_paid:
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                total_invoice = invoice.total_ttc or invoice.amount or 0
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.INVOICE_PAID,
                    title="Facture payée",
                    message=f"La facture {invoice.number} a été marquée comme payée (montant: {total_invoice:.2f} €)",
                    link_url=f"{frontend_url}/app/billing/invoices/{invoice_id}",
                    link_text="Voir la facture",
                    source_type="invoice",
                    source_id=invoice_id,
                )
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"✅ Notification créée pour le paiement de la facture {invoice.number}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur lors de la création de la notification pour la facture {invoice_id}: {e}")
    
    db.commit()
    db.refresh(invoice)
    
    # Logger le changement de statut
    log_status_change(db, invoice.id, current_user.id, old_status, new_status, request)
    
    return invoice


@router.post("/{invoice_id}/credit-note", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_credit_note(
    invoice_id: int,
    credit_data: CreditNoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un avoir (facture rectificative) pour une facture.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer la facture originale
    original_invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not original_invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original invoice not found"
        )
    
    # Vérifier que le montant de l'avoir ne dépasse pas le montant de la facture
    total_credits = db.query(func.sum(Invoice.credit_amount)).filter(
        Invoice.original_invoice_id == invoice_id,
        Invoice.deleted_at.is_(None)
    ).scalar() or Decimal('0')
    
    credit_amount = Decimal(str(credit_data.credit_amount))
    invoice_total = Decimal(str(original_invoice.total_ttc or original_invoice.amount))
    
    if total_credits + credit_amount > invoice_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le montant total des avoirs ({total_credits + credit_amount} €) "
                  f"dépasse le montant de la facture ({invoice_total} €)"
        )
    
    # Générer le numéro d'avoir
    credit_number = generate_invoice_number(db, current_user.company_id, InvoiceType.AVOIR)
    
    # Créer l'avoir
    credit_note = Invoice(
        company_id=current_user.company_id,
        client_id=original_invoice.client_id,
        project_id=original_invoice.project_id,
        number=credit_number,
        invoice_type=InvoiceType.AVOIR,
        original_invoice_id=invoice_id,
        credit_amount=credit_amount,
        status=InvoiceStatus.IMPAYEE,
        
        # Reprendre les informations de la facture originale
        seller_name=original_invoice.seller_name,
        seller_address=original_invoice.seller_address,
        seller_siren=original_invoice.seller_siren,
        seller_siret=original_invoice.seller_siret,
        seller_vat_number=original_invoice.seller_vat_number,
        seller_rcs=original_invoice.seller_rcs,
        seller_legal_form=original_invoice.seller_legal_form,
        seller_capital=original_invoice.seller_capital,
        
        client_name=original_invoice.client_name,
        client_address=original_invoice.client_address,
        client_siren=original_invoice.client_siren,
        client_delivery_address=original_invoice.client_delivery_address,
        
        issue_date=datetime.now(timezone.utc),
        sale_date=original_invoice.sale_date,
        due_date=None,  # Les avoirs n'ont pas d'échéance
        
        payment_terms=credit_data.conditions or original_invoice.payment_terms,
        vat_on_debit=original_invoice.vat_on_debit,
        vat_exemption_reference=original_invoice.vat_exemption_reference,
        operation_category=original_invoice.operation_category,
        vat_applicable=original_invoice.vat_applicable,
        
        notes=credit_data.notes or f"Avoir pour facture {original_invoice.number}",
        conditions=credit_data.conditions or original_invoice.conditions,
    )
    
    # Récupérer les settings de l'entreprise pour les taux de TVA
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    valid_tax_rates = get_valid_tax_rates(company_settings)
    
    db.add(credit_note)
    db.flush()
    
    # Créer les lignes de l'avoir
    for idx, line_data in enumerate(credit_data.lines):
        tax_rate = Decimal(str(line_data.tax_rate))
        if not validate_tax_rate(tax_rate, company_settings):
            valid_rates_str = ", ".join([str(rate) for rate in valid_tax_rates])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Taux de TVA invalide: {tax_rate}. Taux autorisés: {valid_rates_str}"
            )
        
        quantity = Decimal(str(line_data.quantity))
        unit_price = Decimal(str(line_data.unit_price_ht))
        totals = calculate_line_totals(quantity, unit_price, tax_rate)
        
        line = InvoiceLine(
            invoice_id=credit_note.id,
            description=line_data.description,
            quantity=quantity,
            unit=line_data.unit,
            unit_price_ht=unit_price,
            tax_rate=tax_rate,
            subtotal_ht=totals['subtotal_ht'],
            tax_amount=totals['tax_amount'],
            total_ttc=totals['total_ttc'],
            order=idx
        )
        db.add(line)
    
    recalculate_invoice_totals(credit_note)
    
    # Valider les totaux
    is_valid, error_msg = validate_invoice_totals(credit_note)
    if not is_valid:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur de validation des totaux: {error_msg}"
        )
    
    db.commit()
    db.refresh(credit_note)
    
    # Logger la création de l'avoir
    log_credit_note_creation(db, invoice_id, credit_note.id, current_user.id, float(credit_amount), request)
    log_invoice_creation(db, credit_note.id, current_user.id, request)
    
    return credit_note


@router.post("/{invoice_id}/payment", response_model=InvoiceRead)
def add_payment_to_invoice(
    invoice_id: int,
    payment_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Ajoute un paiement à une facture.
    Met à jour automatiquement le statut si la facture est complètement payée.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer la facture
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Vérifier que la facture n'est pas déjà payée
    if invoice.status == InvoiceStatus.PAYEE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette facture est déjà payée"
        )
    
    # Extraire les données du paiement
    amount = Decimal(str(payment_data.get("amount", 0)))
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le montant du paiement doit être supérieur à 0"
        )
    
    total_invoice = invoice.total_ttc or invoice.amount
    
    # Calculer le montant déjà payé
    existing_payments = db.query(func.sum(InvoicePayment.amount)).filter(
        InvoicePayment.invoice_id == invoice_id
    ).scalar() or Decimal('0')
    
    # Vérifier que le nouveau paiement ne dépasse pas le montant restant
    remaining_amount = total_invoice - existing_payments
    if amount > remaining_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le montant du paiement ({amount}) dépasse le montant restant ({remaining_amount})"
        )
    
    # Créer le paiement
    payment = InvoicePayment(
        invoice_id=invoice_id,
        amount=amount,
        payment_date=datetime.fromisoformat(payment_data.get("date", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00')) if isinstance(payment_data.get("date"), str) else datetime.now(timezone.utc),
        payment_method=payment_data.get("payment_method", "virement"),
        reference=payment_data.get("reference"),
        notes=payment_data.get("notes"),
        created_by_id=current_user.id
    )
    db.add(payment)
    
    # Calculer le nouveau montant total payé
    new_total_paid = existing_payments + amount
    
    # Mettre à jour le statut si la facture est complètement payée
    was_paid = invoice.status == InvoiceStatus.PAYEE
    if new_total_paid >= total_invoice:
        invoice.status = InvoiceStatus.PAYEE
        invoice.paid_at = datetime.now(timezone.utc)
        
        # Créer une notification si la facture vient d'être payée
        if not was_paid:
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.INVOICE_PAID,
                    title="Facture payée",
                    message=f"La facture {invoice.number} a été payée (montant: {total_invoice:.2f} €)",
                    link_url=f"{frontend_url}/app/billing/invoices/{invoice_id}",
                    link_text="Voir la facture",
                    source_type="invoice",
                    source_id=invoice_id,
                )
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"✅ Notification créée pour le paiement de la facture {invoice.number}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur lors de la création de la notification pour la facture {invoice_id}: {e}")
    elif invoice.status == InvoiceStatus.IMPAYEE:
        invoice.status = InvoiceStatus.ENVOYEE
    
    db.commit()
    db.refresh(invoice)
    
    # Charger les paiements pour le calcul
    invoice = db.query(Invoice).options(joinedload(Invoice.payments)).filter(Invoice.id == invoice_id).first()
    
    # Remplir les informations client et vendeur
    company = get_company_info(db, current_user.company_id)
    if company:
        populate_seller_info(invoice, company, db)
    
    client = get_client_info(db, invoice.client_id, current_user.company_id)
    if client:
        invoice.client_name = client.name
        invoice.client_address = client.address
    
    return invoice


@router.post("/{invoice_id}/cancel", response_model=InvoiceRead)
def cancel_invoice(
    invoice_id: int,
    request: Request,
    cancel_data: dict = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un avoir (partiel ou total) pour une facture.
    Si le montant n'est pas spécifié, crée un avoir pour le montant restant.
    Si le montant total est crédité, transforme la facture originale en avoir.
    
    Note: Un avoir peut être créé même si la facture n'est pas payée.
    C'est un avoir normal (pas un remboursement), utilisé pour corriger ou annuler une facture.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Vérifier que la facture n'est pas déjà un avoir
    if invoice.invoice_type == InvoiceType.AVOIR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette facture est déjà un avoir"
        )
    
    # Calculer le montant total de la facture
    invoice_total = Decimal(str(invoice.total_ttc or invoice.amount))
    
    # Vérifier s'il existe déjà des avoirs pour cette facture
    existing_credits = db.query(func.sum(Invoice.credit_amount)).filter(
        Invoice.original_invoice_id == invoice_id,
        Invoice.deleted_at.is_(None)
    ).scalar() or Decimal('0')
    
    # Calculer le montant restant à créditer
    remaining_amount = invoice_total - existing_credits
    
    if remaining_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette facture a déjà été entièrement créditée"
        )
    
    # Récupérer le montant demandé (optionnel, par défaut le montant restant)
    requested_amount = None
    if cancel_data and "amount" in cancel_data:
        requested_amount = Decimal(str(cancel_data["amount"]))
        if requested_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le montant de l'avoir doit être supérieur à 0"
            )
        if requested_amount > remaining_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le montant demandé ({requested_amount}) dépasse le montant restant créditable ({remaining_amount})"
            )
    
    # Utiliser le montant demandé ou le montant restant par défaut
    credit_amount = requested_amount if requested_amount else remaining_amount
    
    # Générer le numéro d'avoir
    credit_number = generate_invoice_number(db, current_user.company_id, InvoiceType.AVOIR)
    
    # Calculer le ratio pour les lignes (si avoir partiel)
    ratio = float(credit_amount / invoice_total) if invoice_total > 0 else 1.0
    
    # Calculer les totaux proportionnels
    credit_subtotal_ht = (invoice.subtotal_ht * Decimal(str(ratio))) if invoice.subtotal_ht else None
    credit_total_tax = (invoice.total_tax * Decimal(str(ratio))) if invoice.total_tax else None
    
    # Créer un nouvel avoir
    credit_note = Invoice(
        company_id=current_user.company_id,
        client_id=invoice.client_id,
        project_id=invoice.project_id,
        number=credit_number,
        invoice_type=InvoiceType.AVOIR,
        original_invoice_id=invoice_id,
        quote_id=invoice.quote_id,  # Hériter du quote_id de la facture originale
        credit_amount=credit_amount,
        status=InvoiceStatus.IMPAYEE,
        
        # Reprendre les informations de la facture originale
        seller_name=invoice.seller_name,
        seller_address=invoice.seller_address,
        seller_siren=invoice.seller_siren,
        seller_siret=invoice.seller_siret,
        seller_vat_number=invoice.seller_vat_number,
        seller_rcs=invoice.seller_rcs,
        seller_legal_form=invoice.seller_legal_form,
        seller_capital=invoice.seller_capital,
        
        client_name=invoice.client_name,
        client_address=invoice.client_address,
        client_siren=invoice.client_siren,
        client_delivery_address=invoice.client_delivery_address,
        
        issue_date=datetime.now(timezone.utc),
        sale_date=invoice.sale_date,
        due_date=None,
        
        payment_terms=invoice.payment_terms,
        vat_on_debit=invoice.vat_on_debit,
        vat_exemption_reference=invoice.vat_exemption_reference,
        operation_category=invoice.operation_category,
        vat_applicable=invoice.vat_applicable,
        
        notes=f"Avoir pour annulation partielle de la facture {invoice.number}" if requested_amount and requested_amount < remaining_amount else f"Avoir pour annulation de la facture {invoice.number}",
        conditions=invoice.conditions,
        
        # Totaux proportionnels
        amount=credit_amount,
        subtotal_ht=credit_subtotal_ht,
        total_tax=credit_total_tax,
        total_ttc=credit_amount,
    )
    
    db.add(credit_note)
    db.flush()
    
    # Copier les lignes de la facture originale vers l'avoir (proportionnellement si avoir partiel)
    for original_line in invoice.lines:
        # Calculer les montants proportionnels
        line_ratio = ratio
        line_quantity = -original_line.quantity * Decimal(str(line_ratio))
        line_subtotal_ht = -original_line.subtotal_ht * Decimal(str(line_ratio)) if original_line.subtotal_ht else None
        line_tax_amount = -original_line.tax_amount * Decimal(str(line_ratio)) if original_line.tax_amount else None
        line_total_ttc = -original_line.total_ttc * Decimal(str(line_ratio))
        
        line = InvoiceLine(
            invoice_id=credit_note.id,
            description=original_line.description,
            quantity=line_quantity,
            unit=original_line.unit,
            unit_price_ht=original_line.unit_price_ht,
            tax_rate=original_line.tax_rate,
            subtotal_ht=line_subtotal_ht,
            tax_amount=line_tax_amount,
            total_ttc=line_total_ttc,
            order=original_line.order
        )
        db.add(line)
    
    recalculate_invoice_totals(credit_note)
    
    # Vérifier si le montant total est crédité
    new_total_credits = existing_credits + credit_amount
    is_full_credit = new_total_credits >= invoice_total
    
    # Transformer la facture originale en avoir SEULEMENT si le montant total est crédité
    if is_full_credit:
        old_invoice_type = invoice.invoice_type
        old_status = invoice.status
        invoice.invoice_type = InvoiceType.AVOIR
        invoice.status = InvoiceStatus.ANNULEE
        db.flush()
        # Logger la transformation de la facture
        log_status_change(db, invoice.id, current_user.id, old_status.value, InvoiceStatus.ANNULEE.value, request)
    
    db.commit()
    db.refresh(credit_note)
    db.refresh(invoice)
    
    # Logger la création de l'avoir
    log_credit_note_creation(db, invoice_id, credit_note.id, current_user.id, float(credit_amount), request)
    log_invoice_creation(db, credit_note.id, current_user.id, request)
    
    # Retourner la facture transformée (l'avoir créé)
    client = get_client_info(db, credit_note.client_id, current_user.company_id)
    company = get_company_info(db, current_user.company_id)
    populate_seller_info(credit_note, company, db)
    
    if client:
        credit_note.client_name = client.name
        credit_note.client_address = client.address
    
    return credit_note


@router.post("/{invoice_id}/archive", response_model=InvoiceRead)
def archive_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Archive une facture.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.archived_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice already archived"
        )
    
    invoice.archived_at = datetime.now(timezone.utc)
    invoice.archived_by_id = current_user.id
    
    db.commit()
    db.refresh(invoice)
    
    # Logger l'archivage
    log_invoice_archival(db, invoice.id, current_user.id, request)
    
    return invoice


@router.get("/{invoice_id}/audit-logs", response_model=List[InvoiceAuditLogRead])
def get_invoice_audit_logs(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère l'historique des modifications d'une facture.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que la facture existe et appartient à l'entreprise
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Récupérer les logs
    logs = db.query(InvoiceAuditLog).filter(
        InvoiceAuditLog.invoice_id == invoice_id
    ).order_by(InvoiceAuditLog.timestamp.desc()).all()
    
    # Ajouter le nom de l'utilisateur
    result = []
    for log in logs:
        log_dict = {
            **log.__dict__,
            "user_name": log.user.full_name if log.user else None
        }
        result.append(InvoiceAuditLogRead(**log_dict))
    
    return result


@router.get("/{invoice_id}/related-documents", response_model=RelatedDocumentsResponse)
def get_related_documents(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère tous les documents liés à une facture :
    - Le devis d'origine (si la facture vient d'un devis)
    - Les avoirs créés pour cette facture
    - La facture originale (si c'est un avoir)
    - Les autres factures du même devis
    """
    try:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not attached to a company"
            )
        
        # Vérifier que la facture existe et appartient à l'entreprise
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.company_id == current_user.company_id,
            Invoice.deleted_at.is_(None)
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Debug: logger les informations de la facture
        logging.info(f"Invoice {invoice_id}: quote_id={invoice.quote_id}, original_invoice_id={invoice.original_invoice_id}, invoice_type={invoice.invoice_type}")
        
        related_documents = []
        # Utiliser un set pour tracker les clés uniques (type-id) déjà ajoutées et éviter les doublons
        # Format: "quote-3", "invoice-1", "credit_note-2", etc.
        added_document_keys = set()
        
        # Si c'est un avoir, récupérer la facture originale
        if invoice.invoice_type == InvoiceType.AVOIR and invoice.original_invoice_id:
            try:
                original_invoice = db.query(Invoice).filter(
                    Invoice.id == invoice.original_invoice_id,
                    Invoice.company_id == current_user.company_id,
                    Invoice.deleted_at.is_(None)
                ).first()
                if original_invoice:
                    status_value = str(original_invoice.status)
                    if hasattr(original_invoice.status, 'value'):
                        status_value = original_invoice.status.value
                    
                    total_value = 0.0
                    if original_invoice.total_ttc:
                        total_value = float(original_invoice.total_ttc)
                    elif original_invoice.amount:
                        total_value = float(original_invoice.amount)
                    
                    doc_key = f"invoice-{original_invoice.id}"
                    if doc_key not in added_document_keys:
                        related_documents.append({
                            "type": "invoice",
                            "id": original_invoice.id,
                            "number": original_invoice.number,
                            "status": status_value,
                            "total": total_value,
                            "created_at": original_invoice.created_at.isoformat() if original_invoice.created_at else None,
                        })
                        added_document_keys.add(doc_key)
            except Exception as e:
                logging.error(f"Error fetching original invoice {invoice.original_invoice_id}: {str(e)}", exc_info=True)
        
        # Récupérer le devis d'origine si la facture vient d'un devis
        if invoice.quote_id:
            try:
                logging.info(f"Recherche du devis {invoice.quote_id} pour la facture {invoice_id}")
                quote = db.query(Quote).filter(
                    Quote.id == invoice.quote_id,
                    Quote.company_id == current_user.company_id
                ).first()
                logging.info(f"Devis trouvé: {quote is not None}")
                if quote:
                    try:
                        # Gérer le statut (peut être un enum ou une string)
                        status_value = str(quote.status)
                        if hasattr(quote.status, 'value'):
                            status_value = quote.status.value
                        
                        # Gérer les valeurs Decimal pour la conversion en float
                        total_value = 0.0
                        if quote.total_ttc:
                            total_value = float(quote.total_ttc)
                        elif quote.amount:
                            total_value = float(quote.amount)
                        
                        doc_data = {
                            "type": "quote",
                            "id": quote.id,
                            "number": quote.number,
                            "status": status_value,
                            "total": total_value,
                            "created_at": quote.created_at.isoformat() if quote.created_at else None,
                        }
                        doc_key = f"quote-{quote.id}"
                        if doc_key not in added_document_keys:
                            logging.info(f"Ajout du devis: {doc_data}")
                            related_documents.append(doc_data)
                            added_document_keys.add(doc_key)
                        else:
                            logging.info(f"Devis {quote.id} déjà ajouté, ignoré")
                    except Exception as e:
                        logging.error(f"Erreur lors de l'ajout du devis à la liste: {str(e)}", exc_info=True)
            except Exception as e:
                # Logger l'erreur mais continuer pour les avoirs
                logging.error(f"Error fetching quote {invoice.quote_id}: {str(e)}", exc_info=True)
        
        # Récupérer les avoirs créés pour cette facture (si ce n'est pas déjà un avoir)
        if invoice.invoice_type != InvoiceType.AVOIR:
            try:
                logging.info(f"Recherche des avoirs pour la facture {invoice_id}")
                # Chercher aussi sans le filtre deleted_at pour voir tous les avoirs
                all_credit_notes = db.query(Invoice).filter(
                    Invoice.original_invoice_id == invoice_id,
                    Invoice.company_id == current_user.company_id
                ).all()
                logging.info(f"Tous les avoirs (y compris supprimés): {len(all_credit_notes)}")
                
                credit_notes = db.query(Invoice).filter(
                    Invoice.original_invoice_id == invoice_id,
                    Invoice.invoice_type == InvoiceType.AVOIR,
                    Invoice.company_id == current_user.company_id,
                    Invoice.deleted_at.is_(None)
                ).order_by(Invoice.created_at.desc()).all()
                logging.info(f"Avoirs trouvés (non supprimés): {len(credit_notes)}")
                
                # Log des IDs des avoirs trouvés avec plus de détails
                for cn in credit_notes:
                    logging.info(f"Avoir trouvé: ID={cn.id}, number={cn.number}, original_invoice_id={cn.original_invoice_id}, invoice_type={cn.invoice_type}, deleted_at={cn.deleted_at}")
                
                for credit_note in credit_notes:
                    try:
                        # Pour les avoirs, toujours afficher "Avoir" comme statut
                        status_value = "Avoir"
                        
                        # Gérer les valeurs Decimal pour la conversion en float
                        credit_amount_value = 0.0
                        if credit_note.credit_amount:
                            credit_amount_value = float(credit_note.credit_amount)
                        
                        total_value = 0.0
                        if credit_note.total_ttc:
                            total_value = float(credit_note.total_ttc)
                        elif credit_note.amount:
                            total_value = float(credit_note.amount)
                        
                        doc_data = {
                            "type": "credit_note",
                            "id": credit_note.id,
                            "number": credit_note.number,
                            "status": status_value,
                            "credit_amount": credit_amount_value,
                            "total": total_value,
                            "created_at": credit_note.created_at.isoformat() if credit_note.created_at else None,
                        }
                        doc_key = f"credit_note-{credit_note.id}"
                        if doc_key not in added_document_keys:
                            logging.info(f"Ajout de l'avoir ID={credit_note.id}, number={credit_note.number}: {doc_data}")
                            related_documents.append(doc_data)
                            added_document_keys.add(doc_key)
                        else:
                            logging.warning(f"Avoir {credit_note.id} (number={credit_note.number}) déjà ajouté, ignoré (doublon détecté)")
                    except Exception as e:
                        logging.error(f"Erreur lors de l'ajout de l'avoir {credit_note.id} à la liste: {str(e)}", exc_info=True)
            except Exception as e:
                # Logger l'erreur mais retourner ce qui a été récupéré
                logging.error(f"Error fetching credit notes for invoice {invoice_id}: {str(e)}", exc_info=True)
        
        # Récupérer les autres factures créées depuis le même devis (si la facture vient d'un devis)
        # Inclure aussi les avoirs qui ont le même quote_id
        # Exclure la facture originale si elle a déjà été ajoutée (cas d'un avoir)
        if invoice.quote_id:
            try:
                # Construire le filtre de base
                filter_conditions = [
                    Invoice.quote_id == invoice.quote_id,
                    Invoice.id != invoice_id,
                    Invoice.company_id == current_user.company_id,
                    Invoice.deleted_at.is_(None)
                ]
                
                # Si c'est un avoir et qu'on a déjà ajouté la facture originale, l'exclure
                if invoice.invoice_type == InvoiceType.AVOIR and invoice.original_invoice_id:
                    filter_conditions.append(Invoice.id != invoice.original_invoice_id)
                
                other_invoices = db.query(Invoice).filter(*filter_conditions).order_by(Invoice.created_at.desc()).all()
                
                for other_invoice in other_invoices:
                    # Pour les avoirs, toujours afficher "Avoir" comme statut
                    if other_invoice.invoice_type == InvoiceType.AVOIR:
                        status_value = "Avoir"
                    else:
                        status_value = str(other_invoice.status)
                        if hasattr(other_invoice.status, 'value'):
                            status_value = other_invoice.status.value
                    
                    total_value = 0.0
                    if other_invoice.total_ttc:
                        total_value = float(other_invoice.total_ttc)
                    elif other_invoice.amount:
                        total_value = float(other_invoice.amount)
                    
                    # Déterminer le type : "credit_note" si c'est un avoir, sinon "invoice"
                    doc_type = "credit_note" if other_invoice.invoice_type == InvoiceType.AVOIR else "invoice"
                    
                    doc_data = {
                        "type": doc_type,
                        "id": other_invoice.id,
                        "number": other_invoice.number,
                        "status": status_value,
                        "total": total_value,
                        "created_at": other_invoice.created_at.isoformat() if other_invoice.created_at else None,
                    }
                    
                    # Ajouter credit_amount si c'est un avoir
                    if other_invoice.invoice_type == InvoiceType.AVOIR and other_invoice.credit_amount:
                        doc_data["credit_amount"] = float(other_invoice.credit_amount)
                    
                    # Vérifier si ce document n'a pas déjà été ajouté (pour éviter les doublons)
                    # Important : vérifier aussi si c'est la facture originale déjà ajoutée
                    doc_key = f"{doc_type}-{other_invoice.id}"
                    if doc_key not in added_document_keys:
                        related_documents.append(doc_data)
                        added_document_keys.add(doc_key)
                    else:
                        logging.info(f"Document {other_invoice.id} ({doc_type}) déjà ajouté, ignoré")
            except Exception as e:
                logging.error(f"Error fetching other invoices from quote {invoice.quote_id}: {str(e)}", exc_info=True)
        
        logging.info(f"Total documents liés trouvés: {len(related_documents)}")
        logging.info(f"Documents: {related_documents}")
        
        try:
            response = RelatedDocumentsResponse(
                invoice_id=invoice_id,
                related_documents=related_documents
            )
            logging.info(f"Response créée avec succès: {response}")
            return response
        except Exception as e:
            logging.error(f"Erreur lors de la création de la réponse: {str(e)}", exc_info=True)
            # Fallback: retourner un dictionnaire si le schéma échoue
            return {
                "invoice_id": invoice_id,
                "related_documents": related_documents
            }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in get_related_documents for invoice {invoice_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching related documents: {str(e)}"
        )


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Génère et retourne le PDF d'une facture.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    try:
        pdf_bytes = generate_invoice_pdf(invoice)
        # Adapter le nom du fichier selon le type (facture ou avoir)
        if invoice.invoice_type == InvoiceType.AVOIR:
            filename = f"avoir_{invoice.number}.pdf"
        else:
            filename = f"facture_{invoice.number}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"'
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
