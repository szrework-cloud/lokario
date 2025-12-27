"""
Health check pour la base de données.
Vérifie périodiquement la santé de la connexion DB.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import engine
import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


def check_db_health(db: Session) -> dict:
    """
    Vérifie la santé de la connexion DB.
    
    Returns:
        dict avec les informations de santé :
        - healthy: bool
        - latency_ms: float (temps de réponse en ms)
        - error: str (si erreur)
        - pool_size: int (taille du pool)
        - pool_checked_out: int (connexions utilisées)
    """
    start_time = time.time()
    
    try:
        # Test simple : SELECT 1
        result = db.execute(text("SELECT 1")).scalar()
        
        if result != 1:
            return {
                "healthy": False,
                "latency_ms": (time.time() - start_time) * 1000,
                "error": "Unexpected result from health check",
                "timestamp": datetime.now().isoformat()
            }
        
        # Récupérer les stats du pool
        pool_stats = {
            "pool_size": engine.pool.size() if hasattr(engine, 'pool') else None,
            "pool_checked_out": engine.pool.checkedout() if hasattr(engine, 'pool') else None,
        }
        
        latency_ms = (time.time() - start_time) * 1000
        
        logger.debug(f"✅ DB health check OK ({latency_ms:.2f}ms)")
        
        return {
            "healthy": True,
            "latency_ms": latency_ms,
            "pool_stats": pool_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        error_str = str(e)
        
        logger.warning(f"⚠️ DB health check FAILED ({latency_ms:.2f}ms): {error_str[:200]}")
        
        return {
            "healthy": False,
            "latency_ms": latency_ms,
            "error": error_str[:200],
            "timestamp": datetime.now().isoformat()
        }


def periodic_health_check(db: Session, interval_seconds: int = 30):
    """
    Effectue un health check périodique et invalide le pool si nécessaire.
    
    Args:
        db: Session DB
        interval_seconds: Intervalle entre les checks (défaut: 30s)
    """
    health = check_db_health(db)
    
    if not health["healthy"]:
        # Si le health check échoue, invalider le pool
        logger.warning("🔄 Health check échoué, invalidation du pool...")
        try:
            if hasattr(engine, 'pool'):
                engine.pool.invalidate()
                logger.info("✅ Pool invalidé après health check échoué")
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'invalidation du pool: {e}")
    
    return health

