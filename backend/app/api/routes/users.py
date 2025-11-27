from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.api.schemas.user import UserRead
from app.api.deps import get_current_active_user, get_current_super_admin

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Retourne les informations de l'utilisateur connecté.
    (Alternative à /auth/me)
    """
    return current_user


@router.get("", response_model=List[UserRead])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Liste tous les utilisateurs (réservé aux super_admin).
    """
    users = db.query(User).all()
    return users


@router.get("/company", response_model=List[UserRead])
def get_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Liste les utilisateurs de la company de l'utilisateur courant.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    users = db.query(User).filter(User.company_id == current_user.company_id).all()
    return users

