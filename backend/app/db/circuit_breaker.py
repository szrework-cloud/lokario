"""
Circuit breaker pattern pour gérer les erreurs de connexion DB.
Inspiré des pratiques utilisées par Netflix, Amazon, etc.
"""
from enum import Enum
from typing import Callable, TypeVar, Optional
from datetime import datetime, timedelta
import logging
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """États du circuit breaker."""
    CLOSED = "closed"  # Normal, les requêtes passent
    OPEN = "open"  # Trop d'erreurs, bloquer les requêtes
    HALF_OPEN = "half_open"  # Test si le service est revenu


class CircuitBreaker:
    """
    Circuit breaker pour protéger contre les erreurs de connexion répétées.
    
    Principe :
    - CLOSED : Tout fonctionne, les requêtes passent
    - OPEN : Trop d'erreurs, bloquer les requêtes pendant un délai
    - HALF_OPEN : Tester si le service est revenu (1 requête de test)
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,  # Nombre d'erreurs avant d'ouvrir le circuit
        timeout: float = 60.0,  # Temps en secondes avant de passer en HALF_OPEN
        expected_exception: type = Exception,
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        self.success_count = 0  # Pour HALF_OPEN
    
    def call(self, func: Callable[[], T]) -> T:
        """
        Exécute une fonction avec protection du circuit breaker.
        """
        # Vérifier l'état du circuit
        if self.state == CircuitState.OPEN:
            # Vérifier si on peut passer en HALF_OPEN
            if self.last_failure_time and \
               datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                logger.info("🔄 Circuit breaker: OPEN → HALF_OPEN (test de récupération)")
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                # Circuit toujours ouvert, rejeter la requête
                raise Exception(
                    f"Circuit breaker is OPEN. "
                    f"Too many failures ({self.failure_count}). "
                    f"Will retry after {self.timeout}s"
                )
        
        # Exécuter la fonction
        try:
            result = func()
            
            # Succès : réinitialiser le compteur
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= 2:  # 2 succès consécutifs = OK
                    logger.info("✅ Circuit breaker: HALF_OPEN → CLOSED (service récupéré)")
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
            elif self.state == CircuitState.CLOSED:
                # Réinitialiser le compteur d'erreurs en cas de succès
                if self.failure_count > 0:
                    self.failure_count = 0
            
            return result
            
        except self.expected_exception as e:
            # Erreur détectée
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            if self.state == CircuitState.HALF_OPEN:
                # Échec en HALF_OPEN → retourner en OPEN
                logger.warning("❌ Circuit breaker: HALF_OPEN → OPEN (échec du test)")
                self.state = CircuitState.OPEN
                self.success_count = 0
            elif self.state == CircuitState.CLOSED:
                # Vérifier si on doit ouvrir le circuit
                if self.failure_count >= self.failure_threshold:
                    logger.error(
                        f"🔴 Circuit breaker: CLOSED → OPEN "
                        f"({self.failure_count} erreurs consécutives)"
                    )
                    self.state = CircuitState.OPEN
            
            # Propager l'erreur
            raise
    
    def reset(self):
        """Réinitialiser le circuit breaker manuellement."""
        logger.info("🔄 Circuit breaker réinitialisé manuellement")
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
    
    def get_state(self) -> CircuitState:
        """Obtenir l'état actuel du circuit breaker."""
        return self.state


# Instance globale pour les erreurs de connexion DB
db_circuit_breaker = CircuitBreaker(
    failure_threshold=5,  # 5 erreurs consécutives
    timeout=60.0,  # Attendre 60 secondes avant de réessayer
    expected_exception=Exception,  # Toutes les exceptions
)

