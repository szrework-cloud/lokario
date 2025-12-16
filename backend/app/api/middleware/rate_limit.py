"""
Décorateurs et utilitaires pour le rate limiting.
"""
from functools import wraps
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Callable

# Instance globale du limiter (sera initialisée dans main.py)
limiter: Limiter = None


def get_user_id(request):
    """
    Récupère l'ID de l'utilisateur depuis le token JWT pour le rate limiting par utilisateur.
    Si pas d'utilisateur, utilise l'adresse IP.
    """
    # Essayer de récupérer l'utilisateur depuis le request
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"
    # Sinon utiliser l'adresse IP
    return get_remote_address(request)


def rate_limit_by_user(requests_per_minute: int = 60):
    """
    Décorateur pour limiter le nombre de requêtes par utilisateur.
    
    Args:
        requests_per_minute: Nombre de requêtes autorisées par minute
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Le rate limiting sera appliqué par slowapi via le décorateur @limiter.limit
            return await func(*args, **kwargs)
        return wrapper
    return decorator

