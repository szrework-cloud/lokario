from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional
from app.core.config import settings
from app.db.session import get_db as get_db_session
from app.db.models.user import User
from app.api.schemas.auth import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_db():
    """
    Dépendance pour obtenir une session DB.
    Ouvre une session, la yield, puis la ferme automatiquement.
    """
    yield from get_db_session()


async def get_token_from_header_or_query(
    token_header: Optional[str] = Depends(oauth2_scheme_optional),
    token_query: Optional[str] = Query(None, alias="token")
) -> str:
    """
    Récupère le token depuis le header Authorization ou depuis le paramètre de requête 'token'.
    Utile pour les requêtes depuis des balises <img> qui ne peuvent pas envoyer de headers.
    """
    if token_header:
        return token_header
    if token_query:
        return token_query
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dépendance pour récupérer l'utilisateur courant depuis le JWT.
    
    Raises:
        HTTPException 401 si le token est invalide ou l'utilisateur n'existe pas.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        # Convertir le string en int (car "sub" est stocké comme string dans le JWT)
        user_id = int(user_id_str)
        
        # Convertir company_id en int si présent (peut être None, int, ou string)
        company_id = payload.get("company_id")
        if company_id is not None:
            try:
                company_id = int(company_id) if not isinstance(company_id, int) else company_id
            except (ValueError, TypeError):
                company_id = None
        
        # S'assurer que role est une string
        role = payload.get("role")
        if role is None:
            role = "user"  # Valeur par défaut
        
        token_data = TokenData(
            user_id=user_id,
            company_id=company_id,
            role=str(role)
        )
    except (JWTError, ValueError, TypeError) as e:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dépendance pour vérifier que l'utilisateur est actif et n'est pas en cours de suppression.
    """
    import sys
    import logging
    logger = logging.getLogger(__name__)
    
    # Debug: vérifier si cette dépendance est appelée pour /followups/stats ou /weekly
    import traceback
    stack = traceback.extract_stack()
    if any('/followups/stats' in str(frame) or '/followups/weekly' in str(frame) for frame in stack):
        print(f"[DEPS] get_current_active_user appelé pour user {current_user.id}", file=sys.stderr, flush=True)
        logger.info(f"[DEPS] get_current_active_user appelé pour user {current_user.id}")
    
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Bloquer l'accès si le compte est en cours de suppression
    if current_user.deletion_requested_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deletion in progress. Please restore your account to continue."
        )
    
    return current_user


async def get_current_user_for_restore(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dépendance pour les endpoints de restauration qui permet l'accès même si deletion_requested_at est défini.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Dépendance pour vérifier que l'utilisateur est super_admin.
    
    Raises:
        HTTPException 403 si l'utilisateur n'est pas super_admin.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_company_owner(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Dépendance pour vérifier que l'utilisateur est owner de son entreprise.
    
    Raises:
        HTTPException 403 si l'utilisateur n'est pas owner.
    """
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner role required."
        )
    return current_user


async def get_current_user_from_token_or_query(
    token: str = Depends(get_token_from_header_or_query),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur courant en acceptant le token depuis le header ou le paramètre de requête.
    Utile pour les endpoints d'images qui sont appelés depuis des balises <img>.
    """
    return await get_current_user(token, db)


async def get_current_active_user_from_token_or_query(
    current_user: User = Depends(get_current_user_from_token_or_query)
) -> User:
    """
    Vérifie que l'utilisateur est actif, en acceptant le token depuis le header ou le paramètre de requête.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Dépendance pour récupérer les settings de l'entreprise de l'utilisateur courant.
    
    Si les settings n'existent pas, ils sont créés automatiquement avec les valeurs par défaut.
    
    Raises:
        HTTPException 400 si l'utilisateur n'est pas attaché à une entreprise.
    """
    from app.db.models.company_settings import CompanySettings
    from app.core.defaults import get_default_settings
    
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company",
        )
    
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == current_user.company_id)
        .first()
    )
    
    if not settings:
        # Créer des settings par défaut si manquants
        settings = CompanySettings(
            company_id=current_user.company_id,
            settings=get_default_settings(),
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

