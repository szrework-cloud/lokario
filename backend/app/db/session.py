from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy.exc import DisconnectionError, OperationalError
from app.core.config import settings
from app.db.base import Base
import logging
import time

logger = logging.getLogger(__name__)

# Déterminer si on utilise SQLite ou PostgreSQL
is_sqlite = "sqlite" in settings.DATABASE_URL

# Configuration du pool de connexions
# Pour PostgreSQL/Supabase : utiliser un pool plus grand
# Pour SQLite : pas de pool (une seule connexion)
if is_sqlite:
    # SQLite : pas de pool nécessaire
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL/Supabase : configuration du pool
    # Récupérer les arguments de connexion depuis DATABASE_URL ou utiliser des valeurs par défaut
    connect_args = {}
    
    # Si on utilise Supabase, configurer SSL correctement
    if "supabase.com" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL.lower():
        # Configuration SSL pour PostgreSQL/Supabase
        # sslmode='require' force SSL mais permet des reconnexions automatiques
        # connect_timeout réduit le temps d'attente pour les connexions mortes
        connect_args = {
            "sslmode": "require",
            "connect_timeout": 10,  # Timeout de connexion de 10 secondes
            "keepalives": 1,  # Activer les keepalives TCP
            "keepalives_idle": 30,  # Commencer les keepalives après 30 secondes d'inactivité
            "keepalives_interval": 10,  # Envoyer un keepalive toutes les 10 secondes
            "keepalives_count": 3,  # Nombre de keepalives avant de considérer la connexion morte
        }
    
    engine = create_engine(
        settings.DATABASE_URL,
        # Pool size : nombre de connexions permanentes
        pool_size=10,  # Augmenté de 5 (défaut) à 10
        # Max overflow : connexions supplémentaires autorisées au-delà de pool_size
        max_overflow=20,  # Augmenté de 10 (défaut) à 20 (total max = 30 connexions)
        # Pool timeout : temps d'attente avant d'abandonner si toutes les connexions sont occupées
        pool_timeout=30,  # 30 secondes par défaut
        # Pool recycle : recycler les connexions après ce nombre de secondes (évite les connexions mortes)
        # Réduit à 20 minutes car Supabase peut fermer les connexions inactives plus tôt
        pool_recycle=1200,  # 20 minutes (Supabase peut fermer les connexions inactives)
        # Pool pre ping : vérifier que la connexion est vivante avant de l'utiliser
        # CRUCIAL pour Supabase qui peut fermer les connexions SSL de manière inattendue
        # pool_pre_ping=True fait un SELECT 1 avant chaque utilisation pour détecter les connexions mortes
        pool_pre_ping=True,  # Détecte et recrée automatiquement les connexions mortes
        # Connect args : arguments supplémentaires pour la connexion
        connect_args=connect_args,
        echo=False,
        # Isolation level : utiliser READ COMMITTED pour éviter les deadlocks
        isolation_level="READ COMMITTED"
    )
    
    # Ajouter un listener pour gérer les déconnexions
    @event.listens_for(engine, "connect")
    def set_connection_timeout(dbapi_conn, connection_record):
        """Configure les timeouts de connexion au niveau de la base de données"""
        try:
            # Définir un timeout pour les requêtes (30 secondes)
            with dbapi_conn.cursor() as cursor:
                cursor.execute("SET statement_timeout = '30s'")
        except Exception as e:
            logger.warning(f"Impossible de définir statement_timeout: {e}")
    
    logger.info(f"📊 Pool de connexions configuré: pool_size=10, max_overflow=20, pool_recycle=1200 (20min), pool_pre_ping=True, SSL configuré")

# Session locale pour les requêtes DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dépendance pour obtenir une session DB.
    Ouvre une session, la yield, puis la ferme automatiquement.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialise la base de données en créant toutes les tables.
    Avec retry automatique en cas d'erreur de connexion SSL.
    """
    from sqlalchemy.exc import OperationalError
    
    # Importer psycopg2 seulement si disponible (pour PostgreSQL)
    try:
        from psycopg2 import OperationalError as Psycopg2OperationalError
    except ImportError:
        Psycopg2OperationalError = OperationalError
    
    if is_sqlite:
        # SQLite : pas besoin de retry
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Base de données SQLite initialisée")
    else:
        # PostgreSQL : utiliser retry pour gérer les erreurs SSL au démarrage
        max_retries = 5
        initial_delay = 1.0
        max_delay = 5.0
        backoff_factor = 2.0
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Tester d'abord la connexion avec une requête simple
                from sqlalchemy import text
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                    conn.commit()
                
                # Si la connexion fonctionne, créer les tables
                logger.info(f"🔄 Tentative {attempt + 1}/{max_retries + 1} d'initialisation de la base de données...")
                Base.metadata.create_all(bind=engine)
                logger.info("✅ Base de données PostgreSQL initialisée avec succès")
                return
                
            except (OperationalError, Psycopg2OperationalError) as e:
                last_exception = e
                error_str = str(e).lower()
                
                # Vérifier si c'est une erreur de connexion SSL
                is_ssl_error = any(msg in error_str for msg in [
                    "ssl connection has been closed",
                    "connection closed",
                    "server closed the connection",
                    "connection was closed",
                    "connection reset",
                    "broken pipe",
                    "connection refused"
                ])
                
                if not is_ssl_error:
                    # Si ce n'est pas une erreur de connexion, propager immédiatement
                    logger.error(f"❌ Erreur non liée à la connexion: {e}")
                    raise
                
                # Si c'est la dernière tentative, propager l'erreur
                if attempt >= max_retries:
                    logger.error(f"❌ Échec après {max_retries + 1} tentatives d'initialisation: {e}")
                    raise
                
                # Log de la tentative de retry
                logger.warning(
                    f"⚠️ Erreur de connexion SSL lors de l'initialisation (tentative {attempt + 1}/{max_retries + 1}): {e}. "
                    f"Retry dans {delay:.2f}s..."
                )
                
                # Attendre avant de réessayer
                time.sleep(delay)
                
                # Augmenter le délai pour la prochaine tentative (backoff exponentiel)
                delay = min(delay * backoff_factor, max_delay)
                
                # Invalider le pool de connexions pour forcer la recréation
                try:
                    engine.dispose()
                except Exception:
                    pass
            
            except Exception as e:
                # Pour les autres erreurs, propager immédiatement
                logger.error(f"❌ Erreur inattendue lors de l'initialisation: {e}")
                raise
        
        # Ne devrait jamais arriver ici, mais au cas où
        if last_exception:
            raise last_exception
        raise RuntimeError("Échec inattendu de l'initialisation de la base de données")

