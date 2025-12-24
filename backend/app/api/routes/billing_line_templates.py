"""
Routes API pour gérer les templates de lignes de facturation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db.session import get_db
from app.db.models.billing import BillingLineTemplate
from app.api.schemas.billing_line_template import (
    BillingLineTemplateCreate,
    BillingLineTemplateUpdate,
    BillingLineTemplateRead
)
from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.core.invoice_service import validate_tax_rate, get_valid_tax_rates
from app.db.models.company_settings import CompanySettings

router = APIRouter(prefix="/billing-line-templates", tags=["billing-line-templates"])


@router.get("", response_model=List[BillingLineTemplateRead])
def get_billing_line_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère tous les templates de lignes de facturation de l'entreprise.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Utiliser retry pour gérer les erreurs de connexion SSL
    from app.db.retry import retry_db_operation
    
    @retry_db_operation(max_retries=3, initial_delay=0.5, max_delay=2.0)
    def _get_templates():
        return db.query(BillingLineTemplate).filter(
            BillingLineTemplate.company_id == current_user.company_id
        ).order_by(BillingLineTemplate.created_at.desc()).all()
    
    try:
        templates = _get_templates()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de la récupération des templates de lignes de facturation: {e}", exc_info=True)
        # En cas d'erreur, retourner une liste vide plutôt que de faire échouer la requête
        # Cela permet à l'interface de continuer à fonctionner même si la DB a des problèmes temporaires
        return []
    
    return templates


@router.post("", response_model=BillingLineTemplateRead, status_code=status.HTTP_201_CREATED)
def create_billing_line_template(
    template_data: BillingLineTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un nouveau template de ligne de facturation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Récupérer les settings de l'entreprise pour valider le taux de TVA
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    
    # Valider le taux de TVA
    tax_rate = Decimal(str(template_data.tax_rate))
    if not validate_tax_rate(tax_rate, company_settings):
        valid_rates = get_valid_tax_rates(company_settings)
        valid_rates_str = ", ".join([str(rate) for rate in valid_rates])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Taux de TVA invalide: {tax_rate}. Taux autorisés: {valid_rates_str}"
        )
    
    # Créer le template
    template = BillingLineTemplate(
        company_id=current_user.company_id,
        description=template_data.description,
        unit=template_data.unit,
        unit_price_ht=template_data.unit_price_ht,
        tax_rate=tax_rate,
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.put("/{template_id}", response_model=BillingLineTemplateRead)
def update_billing_line_template(
    template_id: int,
    template_data: BillingLineTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour un template de ligne de facturation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    template = db.query(BillingLineTemplate).filter(
        BillingLineTemplate.id == template_id,
        BillingLineTemplate.company_id == current_user.company_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Récupérer les settings de l'entreprise pour valider le taux de TVA
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    company_settings = company_settings_obj.settings if company_settings_obj else None
    
    # Mettre à jour les champs
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.unit is not None:
        template.unit = template_data.unit
    if template_data.unit_price_ht is not None:
        template.unit_price_ht = template_data.unit_price_ht
    if template_data.tax_rate is not None:
        tax_rate = Decimal(str(template_data.tax_rate))
        if not validate_tax_rate(tax_rate, company_settings):
            valid_rates = get_valid_tax_rates(company_settings)
            valid_rates_str = ", ".join([str(rate) for rate in valid_rates])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Taux de TVA invalide: {tax_rate}. Taux autorisés: {valid_rates_str}"
            )
        template.tax_rate = tax_rate
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_billing_line_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime un template de ligne de facturation.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    template = db.query(BillingLineTemplate).filter(
        BillingLineTemplate.id == template_id,
        BillingLineTemplate.company_id == current_user.company_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    db.delete(template)
    db.commit()
    
    return None

