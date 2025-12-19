"""
Utility functions for retrying database operations that may fail due to connection issues.
"""
from functools import wraps
from typing import Callable, TypeVar, Any
from sqlalchemy.exc import OperationalError, DisconnectionError
from sqlalchemy.orm import Session
import logging
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')

# Types d'erreurs qui indiquent une perte de connexion
CONNECTION_ERRORS = (
    OperationalError,
    DisconnectionError,
)

# Messages d'erreur qui indiquent une perte de connexion SSL
SSL_ERROR_MESSAGES = [
    "SSL connection has been closed unexpectedly",
    "connection closed",
    "server closed the connection",
    "connection was closed",
    "connection reset",
    "broken pipe",
    "connection refused",
]


def is_connection_error(error: Exception) -> bool:
    """
    Vérifie si une erreur est liée à une perte de connexion.
    """
    # Vérifier le type d'erreur
    if isinstance(error, CONNECTION_ERRORS):
        return True
    
    # Vérifier le message d'erreur
    error_str = str(error).lower()
    for msg in SSL_ERROR_MESSAGES:
        if msg.lower() in error_str:
            return True
    
    return False


def retry_db_operation(
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 2.0,
    backoff_factor: float = 2.0
):
    """
    Décorateur pour réessayer les opérations de base de données en cas d'erreur de connexion.
    
    Args:
        max_retries: Nombre maximum de tentatives (défaut: 3)
        initial_delay: Délai initial avant le premier retry en secondes (défaut: 0.5)
        max_delay: Délai maximum entre les tentatives en secondes (défaut: 2.0)
        backoff_factor: Facteur d'augmentation du délai entre les tentatives (défaut: 2.0)
    
    Usage:
        @retry_db_operation(max_retries=3)
        def my_db_function(db: Session):
            return db.query(Model).all()
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            delay = initial_delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    # Si ce n'est pas une erreur de connexion, propager immédiatement
                    if not is_connection_error(e):
                        logger.error(f"Erreur non liée à la connexion dans {func.__name__}: {e}")
                        raise
                    
                    # Si c'est la dernière tentative, propager l'erreur
                    if attempt >= max_retries:
                        logger.error(
                            f"Échec après {max_retries + 1} tentatives dans {func.__name__}: {e}"
                        )
                        raise
                    
                    # Log de la tentative de retry
                    logger.warning(
                        f"Erreur de connexion dans {func.__name__} (tentative {attempt + 1}/{max_retries + 1}): {e}. "
                        f"Retry dans {delay:.2f}s..."
                    )
                    
                    # Attendre avant de réessayer
                    time.sleep(delay)
                    
                    # Augmenter le délai pour la prochaine tentative (backoff exponentiel)
                    delay = min(delay * backoff_factor, max_delay)
                    
                    # Invalider la session ET le pool si elle existe dans les arguments
                    for arg in args:
                        if isinstance(arg, Session):
                            try:
                                arg.rollback()
                                arg.close()
                                # Invalider le pool pour forcer de nouvelles connexions
                                if hasattr(arg, 'bind') and hasattr(arg.bind, 'dispose'):
                                    arg.bind.dispose()
                            except Exception:
                                pass
                            break
            
            # Ne devrait jamais arriver ici, mais au cas où
            if last_exception:
                raise last_exception
            
            raise RuntimeError(f"Échec inattendu dans {func.__name__}")
        
        return wrapper
    return decorator


def execute_with_retry(
    db: Session,
    operation: Callable[[], T],
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 2.0,
    backoff_factor: float = 2.0
) -> T:
    """
    Exécute une opération de base de données avec retry automatique en cas d'erreur de connexion.
    
    Args:
        db: Session SQLAlchemy
        operation: Fonction à exécuter (lambda ou fonction) - DOIT utiliser 'db' passé en paramètre
        max_retries: Nombre maximum de tentatives (défaut: 3)
        initial_delay: Délai initial avant le premier retry en secondes (défaut: 0.5)
        max_delay: Délai maximum entre les tentatives en secondes (défaut: 2.0)
        backoff_factor: Facteur d'augmentation du délai entre les tentatives (défaut: 2.0)
    
    Returns:
        Résultat de l'opération
    
    Usage:
        result = execute_with_retry(db, lambda: db.query(Model).all())
    """
    last_exception = None
    delay = initial_delay
    
    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"🔄 Tentative {attempt + 1}/{max_retries + 1} d'exécution de l'opération...")
            # Exécuter l'opération
            result = operation()
            # Si on arrive ici, l'opération a réussi
            if attempt > 0:
                logger.info(f"✅ Connexion réussie après {attempt} tentative(s) de retry")
            return result
        except Exception as e:
            last_exception = e
            error_str = str(e)
            
            # Si ce n'est pas une erreur de connexion, propager immédiatement
            if not is_connection_error(e):
                logger.error(f"❌ Erreur non liée à la connexion: {error_str[:200]}")
                raise
            
            # Si c'est la dernière tentative, propager l'erreur
            if attempt >= max_retries:
                logger.error(
                    f"❌ Échec après {max_retries + 1} tentatives. Dernière erreur: {error_str[:200]}"
                )
                raise
            
            # Log de la tentative de retry
            logger.warning(
                f"⚠️ Erreur de connexion (tentative {attempt + 1}/{max_retries + 1}): {error_str[:150]}"
            )
            logger.info(f"⏳ Attente de {delay:.2f}s avant la tentative {attempt + 2}...")
            
            # Nettoyer la session avant de réessayer
            try:
                db.rollback()  # Rollback de la transaction en cours
                db.expire_all()  # Expirer tous les objets de la session
                # Avec NullPool, dispose() ne fait rien mais on l'appelle quand même
                if hasattr(db, 'bind') and hasattr(db.bind, 'dispose'):
                    db.bind.dispose()
                logger.debug(f"🔄 Session nettoyée après tentative {attempt + 1}")
            except Exception as cleanup_error:
                logger.warning(f"⚠️ Erreur lors du nettoyage de la session: {cleanup_error}")
            
            # Attendre avant de réessayer
            time.sleep(delay)
            logger.debug(f"✅ Attente terminée, passage à la tentative {attempt + 2}")
            
            # Augmenter le délai pour la prochaine tentative (backoff exponentiel)
            delay = min(delay * backoff_factor, max_delay)
    
    # Ne devrait jamais arriver ici, mais au cas où
    if last_exception:
        raise last_exception
    
    raise RuntimeError("Échec inattendu")
