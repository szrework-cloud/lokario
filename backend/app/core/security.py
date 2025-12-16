from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si le mot de passe en clair correspond au hash."""
    # Limiter à 72 bytes pour bcrypt
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Valide la force d'un mot de passe.
    Retourne (is_valid, error_message)
    
    Règles:
    - Minimum 8 caractères
    - Au moins une majuscule
    - Au moins une minuscule
    - Au moins un chiffre
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    
    import re
    if not re.search(r'[A-Z]', password):
        return False, "Le mot de passe doit contenir au moins une majuscule"
    
    if not re.search(r'[a-z]', password):
        return False, "Le mot de passe doit contenir au moins une minuscule"
    
    if not re.search(r'\d', password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    
    return True, ""


def get_password_hash(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    # Limiter à 72 bytes pour bcrypt
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un JWT avec les données fournies.
    
    Args:
        data: Dictionnaire contenant les données à encoder (user_id, company_id, role, etc.)
        expires_delta: Délai d'expiration personnalisé (optionnel)
    
    Returns:
        Token JWT encodé
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

