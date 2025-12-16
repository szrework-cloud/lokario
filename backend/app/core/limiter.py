"""
Configuration du rate limiting pour l'application.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Instance globale du limiter
limiter = Limiter(key_func=get_remote_address)
