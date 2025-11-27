from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.defaults import get_default_settings
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.api.schemas.auth import Token, LoginRequest
from app.api.schemas.user import UserCreate, UserRead
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Enregistre un nouvel utilisateur.
    
    TODO: 
    - Vérifier si on permet le register public ou seulement via super_admin
    - Ajouter validation email
    - Ajouter validation mot de passe (force, etc.)
    """
    # Super admin creation is reserved
    if user_data.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin creation is reserved"
        )
    
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Si owner et company_name fourni, créer la company
    company_id = user_data.company_id
    if user_data.role == "owner" and user_data.company_name:
        company = Company(name=user_data.company_name, sector=user_data.sector)
        db.add(company)
        db.flush()  # Pour obtenir l'ID sans commit
        company_id = company.id
        
        # Créer les settings par défaut pour la nouvelle entreprise
        company_settings = CompanySettings(
            company_id=company.id,
            settings=get_default_settings()
        )
        db.add(company_settings)
    
    # Créer l'utilisateur
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        company_id=company_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authentifie un utilisateur et retourne un JWT.
    
    TODO:
    - Ajouter rate limiting
    - Ajouter logs de tentatives de connexion
    - Gérer les cas de compte bloqué
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Créer le token JWT
    # Note: "sub" doit être une string selon la spécification JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),  # Convertir en string pour JWT
            "company_id": user.company_id,
            "role": user.role
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retourne les informations de l'utilisateur connecté.
    """
    return current_user

