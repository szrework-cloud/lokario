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
    
    # Utiliser retry avec nouvelle session à chaque tentative pour gérer les erreurs de connexion SSL
    from app.db.retry import is_connection_error
    from app.db.session import SessionLocal
    import logging
    import time
    
    logger = logging.getLogger(__name__)
    
    # Fonction pour obtenir les templates avec retry et nouvelle session à chaque tentative
    def _get_templates_with_retry():
        last_exception = None
        
        for attempt in range(4):  # 4 tentatives (0, 1, 2, 3)
            new_session = None
            try:
                # Créer une nouvelle session à chaque tentative
                new_session = SessionLocal()
                templates = new_session.query(BillingLineTemplate).filter(
                    BillingLineTemplate.company_id == current_user.company_id
                ).order_by(BillingLineTemplate.created_at.desc()).all()
                return templates
            except Exception as e:
                last_exception = e
                if new_session:
                    try:
                        new_session.rollback()
                        new_session.close()
                    except:
                        pass
                
                # Vérifier si c'est une erreur de connexion
                if not is_connection_error(e):
                    # Si ce n'est pas une erreur de connexion, propager immédiatement
                    raise
                
                if attempt < 3:  # Pas la dernière tentative
                    delay = 0.5 * (2 ** attempt)  # 0.5s, 1s, 2s
                    logger.warning(f"Erreur de connexion lors de la récupération des templates (tentative {attempt + 1}/4): {e}. Retry dans {delay:.2f}s...")
                    time.sleep(delay)
                else:
                    # Dernière tentative échouée
                    logger.error(f"Échec après 4 tentatives de récupération des templates: {e}", exc_info=True)
            finally:
                if new_session:
                    try:
                        new_session.close()
                    except:
                        pass
        
        # Si on arrive ici, toutes les tentatives ont échoué
        raise last_exception if last_exception else Exception("Erreur inconnue lors de la récupération des templates")
    
    try:
        templates = _get_templates_with_retry()
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des templates de lignes de facturation après retry: {e}", exc_info=True)
        # En cas d'erreur persistante, retourner une liste vide plutôt que de faire échouer la requête
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
        # Permettre de supprimer l'unité en envoyant une chaîne vide
        template.unit = template_data.unit.strip() if template_data.unit.strip() else None
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

