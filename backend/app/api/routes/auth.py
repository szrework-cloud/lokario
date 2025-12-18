from datetime import timedelta, datetime
import random
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger(__name__)
from app.core.security import verify_password, get_password_hash, create_access_token, validate_password_strength
from app.core.defaults import get_default_settings
from app.core.email import (
    generate_verification_token,
    get_verification_token_expiry,
    send_verification_email,
    send_password_reset_email,
)
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.api.schemas.auth import Token, LoginRequest
from app.api.schemas.user import UserCreate, UserRead
from app.api.deps import get_current_active_user


def generate_unique_company_code(db: Session) -> str:
    """
    Génère un code unique à 6 chiffres pour une entreprise.
    Continue jusqu'à trouver un code qui n'existe pas déjà.
    """
    max_attempts = 100
    for _ in range(max_attempts):
        code = f"{random.randint(100000, 999999)}"
        existing = db.query(Company).filter(Company.code == code).first()
        if not existing:
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Impossible de générer un code unique. Veuillez réessayer."
    )

router = APIRouter(prefix="/auth", tags=["auth"])

# Import du limiter pour le rate limiting
from app.core.limiter import limiter


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")  # 3 inscriptions par heure par IP
def register(
    request: Request,
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Enregistre un nouvel utilisateur.
    
    TODO: 
    - Vérifier si on permet le register public ou seulement via super_admin
    - Ajouter validation email
    - Ajouter validation mot de passe (force, etc.)
    """
    logger.info(f"📝 Début de l'inscription pour l'email: {user_data.email}")
    
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
    
    # Déterminer le company_id
    company_id = user_data.company_id
    
    # Si company_code fourni, chercher l'entreprise par code
    if user_data.company_code:
        logger.info(f"🔍 Recherche de l'entreprise par code: {user_data.company_code}")
        company = db.query(Company).filter(Company.code == user_data.company_code).first()
        if not company:
            logger.warning(f"❌ Entreprise introuvable avec le code: {user_data.company_code}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entreprise avec le code {user_data.company_code} introuvable"
            )
        company_id = company.id
        logger.info(f"✅ Entreprise trouvée: {company.name} (ID: {company_id})")
        # Si code fourni, créer un user (pas un owner)
        if user_data.role == "owner":
            # Forcer le rôle à user si un code est fourni
            logger.info(f"⚠️  Rôle 'owner' changé en 'user' car un company_code a été fourni")
            user_data.role = "user"
    
    # Valider la force du mot de passe
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        logger.warning(f"❌ Mot de passe trop faible pour: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    logger.info(f"✅ Validation du mot de passe réussie pour: {user_data.email}")
    
    # Si owner et company_name fourni, créer la company
    if user_data.role == "owner" and user_data.company_name:
        logger.info(f"🏢 Création d'une nouvelle entreprise: {user_data.company_name}")
        import re
        # Générer un code unique à 6 chiffres
        company_code = generate_unique_company_code(db)
        logger.info(f"   Code généré pour l'entreprise: {company_code}")
        # Générer un slug à partir du nom
        base_slug = re.sub(r'[^a-z0-9]+', '-', user_data.company_name.lower()).strip('-')
        # Vérifier l'unicité du slug
        slug = base_slug
        slug_counter = 1
        while db.query(Company).filter(Company.slug == slug).first():
            slug = f"{base_slug}-{slug_counter}"
            slug_counter += 1
        
        company = Company(
            code=company_code,
            name=user_data.company_name,
            slug=slug,
            sector=user_data.sector
        )
        db.add(company)
        db.flush()  # Pour obtenir l'ID sans commit
        company_id = company.id
        logger.info(f"   Entreprise créée avec ID: {company_id}, slug: {slug}")
        
        # Créer les settings par défaut pour la nouvelle entreprise
        company_settings = CompanySettings(
            company_id=company.id,
            settings=get_default_settings()
        )
        db.add(company_settings)
        logger.info(f"   Settings par défaut créés pour l'entreprise {company_id}")
    
    # Si user et company_id fourni directement, vérifier que l'entreprise existe
    if user_data.role == "user" and user_data.company_id and not user_data.company_code:
        logger.info(f"🔍 Vérification de l'entreprise avec ID: {user_data.company_id}")
        company = db.query(Company).filter(Company.id == user_data.company_id).first()
        if not company:
            logger.warning(f"❌ Entreprise introuvable avec l'ID: {user_data.company_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with id {user_data.company_id} not found"
            )
        company_id = user_data.company_id
        logger.info(f"✅ Entreprise trouvée: {company.name} (ID: {company_id})")
    
    # Générer un token de vérification
    verification_token = generate_verification_token()
    token_expires_at = get_verification_token_expiry()
    
    # Créer l'utilisateur (email non vérifié par défaut)
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        company_id=company_id,
        email_verified=False,  # Email non vérifié au départ
        email_verification_token=verification_token,
        email_verification_token_expires_at=token_expires_at
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Envoyer l'email de vérification en arrière-plan (NON-BLOQUANT)
    # Cela permet de répondre immédiatement à l'utilisateur sans attendre l'envoi SMTP
    background_tasks.add_task(
        send_verification_email,
        email=user.email,
        token=verification_token,
        full_name=user.full_name
    )
    
    return user


@router.post("/verify-email/{token}", status_code=status.HTTP_200_OK)
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Vérifie l'email de l'utilisateur avec le token fourni.
    """
    user = db.query(User).filter(User.email_verification_token == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de vérification invalide"
        )
    
    # Vérifier si le token a expiré
    if user.email_verification_token_expires_at and user.email_verification_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le token de vérification a expiré. Veuillez demander un nouveau lien."
        )
    
    # Vérifier si l'email est déjà vérifié
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà vérifié"
        )
    
    # Marquer l'email comme vérifié et supprimer le token
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_token_expires_at = None
    db.commit()
    
    return {"message": "Email vérifié avec succès"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification_email(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Renvoie un email de vérification à l'utilisateur.
    Nécessite le mot de passe pour sécurité.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        # Ne pas révéler si l'email existe ou non (sécurité)
        return {"message": "Si cet email existe, un nouveau lien de vérification a été envoyé"}
    
    # Vérifier le mot de passe
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    # Si déjà vérifié, ne rien faire
    if user.email_verified:
        return {"message": "Cet email est déjà vérifié"}
    
    # Générer un nouveau token
    verification_token = generate_verification_token()
    token_expires_at = get_verification_token_expiry()
    
    user.email_verification_token = verification_token
    user.email_verification_token_expires_at = token_expires_at
    db.commit()
    
    # Envoyer l'email
    try:
        send_verification_email(
            email=user.email,
            token=verification_token,
            full_name=user.full_name
        )
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de vérification: {e}")
    
    return {"message": "Un nouveau lien de vérification a été envoyé à votre adresse email"}


@router.post("/resend-verification-no-password", status_code=status.HTTP_200_OK)
def resend_verification_email_no_password(
    email_data: dict,
    db: Session = Depends(get_db)
):
    """
    Renvoie un email de vérification sans nécessiter le mot de passe.
    Moins sécurisé mais plus pratique pour l'utilisateur.
    """
    email = email_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email requis"
        )
    
    user = db.query(User).filter(User.email == email.lower()).first()
    
    if not user:
        # Ne pas révéler si l'email existe ou non (sécurité)
        return {"message": "Si cet email existe, un nouveau lien de vérification a été envoyé"}
    
    # Si déjà vérifié, ne rien faire
    if user.email_verified:
        return {"message": "Cet email est déjà vérifié"}
    
    # Générer un nouveau token
    verification_token = generate_verification_token()
    token_expires_at = get_verification_token_expiry()
    
    user.email_verification_token = verification_token
    user.email_verification_token_expires_at = token_expires_at
    db.commit()
    
    # Envoyer l'email
    try:
        send_verification_email(
            email=user.email,
            token=verification_token,
            full_name=user.full_name
        )
        print(f"✅ Email de vérification renvoyé à {user.email} (sans mot de passe)")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de vérification: {e}")
    
    return {"message": "Un nouveau lien de vérification a été envoyé à votre adresse email"}


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # 5 tentatives par minute pour prévenir les attaques par force brute
def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authentifie un utilisateur et retourne un JWT.
    Rate limiting activé: 5 tentatives par minute.
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
    
    # Vérifier que l'email est vérifié
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your email and click the verification link."
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


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/hour")  # Limiter les demandes de reset de mot de passe
def forgot_password(
    request: Request,
    email_data: dict,
    db: Session = Depends(get_db)
):
    """
    Demande de réinitialisation de mot de passe.
    Envoie un email avec un lien de réinitialisation.
    """
    email = email_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email requis"
        )
    
    user = db.query(User).filter(User.email == email.lower()).first()
    
    # Ne pas révéler si l'email existe ou non (sécurité)
    if not user:
        # Retourner quand même un succès pour ne pas révéler si l'email existe
        return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé"}
    
    # Générer un token de réinitialisation
    reset_token = generate_verification_token()
    token_expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 heure de validité
    
    user.password_reset_token = reset_token
    user.password_reset_token_expires_at = token_expires_at
    db.commit()
    
    # Envoyer l'email
    try:
        send_password_reset_email(
            email=user.email,
            token=reset_token,
            full_name=user.full_name
        )
        print(f"✅ Email de réinitialisation envoyé à {user.email}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de réinitialisation: {e}")
    
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    reset_data: dict,
    db: Session = Depends(get_db)
):
    """
    Réinitialise le mot de passe avec un token.
    """
    token = reset_data.get("token")
    new_password = reset_data.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token et nouveau mot de passe requis"
        )
    
    # Valider la force du nouveau mot de passe
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    user = db.query(User).filter(User.password_reset_token == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide ou expiré"
        )
    
    # Vérifier l'expiration
    if user.password_reset_token_expires_at and user.password_reset_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expiré. Veuillez demander un nouveau lien."
        )
    
    # Mettre à jour le mot de passe
    user.hashed_password = get_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    db.commit()
    
    return {"message": "Mot de passe réinitialisé avec succès"}

