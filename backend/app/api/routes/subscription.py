"""
Routes API pour vérifier les fonctionnalités disponibles selon le plan
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.db.models.user import User
from app.core.subscription_limits import is_feature_enabled

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/features")
def get_available_features(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retourne la liste des fonctionnalités disponibles pour l'utilisateur selon son plan"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    features = {
        "appointments": is_feature_enabled(db, current_user.company_id, "appointments"),
        "inbox": is_feature_enabled(db, current_user.company_id, "inbox"),
        "excel_export": is_feature_enabled(db, current_user.company_id, "excel_export"),
        "custom_branding": is_feature_enabled(db, current_user.company_id, "custom_branding"),
        "api_access": is_feature_enabled(db, current_user.company_id, "api_access"),
        "advanced_reports": is_feature_enabled(db, current_user.company_id, "advanced_reports"),
        "projects": is_feature_enabled(db, current_user.company_id, "projects"),
    }
    
    return features

