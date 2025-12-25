"""
Module pour throttler les requêtes OpenAI afin d'éviter les rate limits.
Utilise un système de verrouillage thread-safe pour garantir un délai minimum entre les requêtes.
"""
import time
import threading
import logging

logger = logging.getLogger(__name__)

# Rate limiting pour OpenAI API
# Limite: maximum 3 requêtes par seconde (pour éviter les 429)
_openai_last_request_time = 0
_openai_request_lock = threading.Lock()
_openai_min_delay_seconds = 0.35  # Délai minimum entre requêtes (1/3 ≈ 0.33s, avec marge)


def throttle_openai_request():
    """
    Throttle les requêtes OpenAI pour éviter de dépasser les rate limits.
    Assure un délai minimum entre les requêtes.
    
    Cette fonction doit être appelée AVANT chaque appel à l'API OpenAI.
    Elle est thread-safe et garantit qu'il y a un délai minimum entre les requêtes,
    même si plusieurs threads appellent l'API simultanément.
    """
    global _openai_last_request_time
    
    with _openai_request_lock:
        current_time = time.time()
        time_since_last_request = current_time - _openai_last_request_time
        
        if time_since_last_request < _openai_min_delay_seconds:
            sleep_time = _openai_min_delay_seconds - time_since_last_request
            logger.debug(f"[AI THROTTLE] Délai de {sleep_time:.3f}s pour respecter rate limit")
            time.sleep(sleep_time)
        
        _openai_last_request_time = time.time()

