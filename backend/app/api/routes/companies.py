from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.company import Company
from app.api.schemas.company import CompanyRead
from app.api.schemas.company_settings import (
    CompanySettingsRead,
    CompanySettingsUpdate,
    CompanyWithSettings,
)
from app.api.deps import (
    get_current_active_user,
    get_current_super_admin,
    get_current_company_settings,
)
from app.db.models.user import User

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyRead)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retourne la company de l'utilisateur courant.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=List[CompanyRead])
def get_all_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Liste toutes les companies (réservé aux super_admin).
    """
    companies = db.query(Company).all()
    return companies


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère une entreprise spécifique.
    Accessible aux super_admin pour toutes les entreprises, ou aux owners/users pour leur propre entreprise.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Si pas super_admin, vérifier que l'utilisateur appartient à cette entreprise
    if current_user.role != "super_admin":
        if current_user.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to access this company"
            )
    
    return company


@router.get("/me/settings", response_model=CompanyWithSettings)
def get_my_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    settings = Depends(get_current_company_settings),
):
    """
    Récupère les informations de l'entreprise et ses settings.
    """
    company = (
        db.query(Company)
        .filter(Company.id == current_user.company_id)
        .first()
    )
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "company": company,
        "settings": settings,
    }


@router.patch("/me/settings", response_model=CompanySettingsRead)
def update_my_company_settings(
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    settings = Depends(get_current_company_settings),
):
    """
    Met à jour les settings de l'entreprise.
    
    Autorisé uniquement pour owner et super_admin.
    
    IMPORTANT: Les owners ne peuvent PAS modifier les modules (réservés au super_admin).
    Ils peuvent seulement modifier ia et integrations.
    
    TODO: Valider la structure des settings plus tard
    TODO: Gérer des plans (Starter/Pro/etc.) avec des restrictions
    TODO: Affiner la granularité (interdire certains champs IA qui ont un impact coût)
    """
    from copy import deepcopy
    
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    existing = deepcopy(settings.settings)
    incoming = payload.settings
    
    # Si owner, on garde les modules existants (pas de modification autorisée)
    if current_user.role == "owner":
        # Le owner ne peut PAS modifier les modules
        incoming["modules"] = existing.get("modules", {})
    
    settings.settings = incoming
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    return settings


# ============================================================================
# Routes ADMIN pour gérer les settings d'une entreprise (super_admin uniquement)
# ============================================================================

@router.get("/{company_id}/settings", response_model=CompanySettingsRead)
def get_company_settings_admin(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Récupère les settings d'une entreprise (super_admin uniquement).
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed. Super admin only."
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    from app.db.models.company_settings import CompanySettings
    from app.core.defaults import get_default_settings
    
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == company_id)
        .first()
    )
    
    if not settings:
        # Créer des settings par défaut si manquants
        settings = CompanySettings(
            company_id=company_id,
            settings=get_default_settings(),
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.patch("/{company_id}/settings", response_model=CompanySettingsRead)
def update_company_settings_admin(
    company_id: int,
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Met à jour les settings d'une entreprise (super_admin uniquement).
    Permet de modifier TOUT, y compris les modules payants.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed. Super admin only."
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    from app.db.models.company_settings import CompanySettings
    
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == company_id)
        .first()
    )
    
    if not settings:
        from app.core.defaults import get_default_settings
        settings = CompanySettings(
            company_id=company_id,
            settings=get_default_settings(),
        )
        db.add(settings)
    
    # Le super_admin peut modifier TOUT, y compris les modules
    settings.settings = payload.settings
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    return settings

