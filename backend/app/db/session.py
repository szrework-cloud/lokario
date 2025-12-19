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
    
    # Désactiver le listener qui peut causer des problèmes SSL au démarrage
    # Le pooler Supabase gère déjà les timeouts
    # @event.listens_for(engine, "connect")
    # def set_connection_timeout(dbapi_conn, connection_record):
    #     """Configure les timeouts de connexion au niveau de la base de données"""
    #     try:
    #         # Définir un timeout pour les requêtes (30 secondes)
    #         with dbapi_conn.cursor() as cursor:
    #             cursor.execute("SET statement_timeout = '30s'")
    #     except Exception as e:
    #         logger.warning(f"Impossible de définir statement_timeout: {e}")
    
    logger.info(f"📊 Pool de connexions configuré: pool_size=10, max_overflow=20, pool_recycle=1200 (20min), pool_pre_ping=True, Pooler Supabase")

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
    Ne fait pas échouer le démarrage si les tables existent déjà.
    """
    from sqlalchemy.exc import OperationalError
    
    # Importer psycopg2 seulement si disponible (pour PostgreSQL)
    try:
        from psycopg2 import OperationalError as Psycopg2OperationalError
    except ImportError:
        Psycopg2OperationalError = OperationalError
    
    if is_sqlite:
        # SQLite : pas besoin de retry
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Base de données SQLite initialisée")
        except Exception as e:
            logger.warning(f"⚠️ Erreur lors de l'initialisation SQLite (tables peuvent exister déjà): {e}")
    else:
        # PostgreSQL : En production, ne pas créer les tables (elles existent déjà)
        # Juste vérifier que la connexion fonctionne
        from app.core.config import settings
        
        if settings.ENVIRONMENT.lower() in ["production", "prod"]:
            # En production : juste vérifier la connexion, ne pas créer les tables
            logger.info("🔍 Mode production : vérification de la connexion DB (tables supposées existantes)...")
            try:
                from sqlalchemy import inspect
                inspector = inspect(engine)
                existing_tables = inspector.get_table_names()
                if existing_tables:
                    logger.info(f"✅ Connexion DB OK - {len(existing_tables)} table(s) détectée(s)")
                    return
                else:
                    logger.warning("⚠️ Aucune table détectée, mais l'application va continuer")
                    return
            except Exception as e:
                logger.warning(f"⚠️ Impossible de vérifier les tables (connexion peut être OK): {e}")
                logger.warning("⚠️ L'application va continuer le démarrage")
                return
        
        # En développement/staging : créer les tables avec retry
        logger.info("🔄 Mode développement : création des tables...")
        max_retries = 2  # Réduire à 2 tentatives
        initial_delay = 2.0
        max_delay = 5.0
        delay = initial_delay
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"🔄 Tentative {attempt + 1}/{max_retries + 1}...")
                    time.sleep(delay)
                    delay = min(delay * 2, max_delay)
                
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
                    # Si ce n'est pas une erreur de connexion, vérifier si les tables existent déjà
                    # Si oui, on peut continuer sans erreur
                    try:
                        from sqlalchemy import inspect
                        inspector = inspect(engine)
                        existing_tables = inspector.get_table_names()
                        if existing_tables:
                            logger.info(f"✅ Les tables existent déjà ({len(existing_tables)} table(s)). Initialisation non nécessaire.")
                            return
                    except Exception:
                        pass
                    
                    # Si les tables n'existent pas, propager l'erreur
                    logger.error(f"❌ Erreur non liée à la connexion: {e}")
                    raise
                
                # Si c'est la dernière tentative, vérifier si les tables existent déjà
                if attempt >= max_retries:
                    logger.warning(f"⚠️ Échec après {max_retries + 1} tentatives d'initialisation: {e}")
                    # Vérifier si les tables existent déjà avant de lever l'erreur
                    try:
                        from sqlalchemy import inspect
                        inspector = inspect(engine)
                        existing_tables = inspector.get_table_names()
                        if existing_tables:
                            logger.info(f"✅ Les tables existent déjà ({len(existing_tables)} table(s)). L'application peut démarrer.")
                            return
                    except Exception as inspect_error:
                        logger.warning(f"⚠️ Impossible de vérifier l'existence des tables: {inspect_error}")
                    
                    # Si on arrive ici, les tables n'existent probablement pas
                    # Mais on ne fait pas échouer le démarrage - l'application peut fonctionner
                    # si les tables sont créées manuellement ou par migration
                    logger.warning("⚠️ Impossible d'initialiser la base de données, mais l'application va continuer le démarrage.")
                    logger.warning("⚠️ Les tables peuvent exister déjà ou être créées par une migration.")
                    return  # Ne pas lever d'exception
                
                # Log de la tentative de retry
                logger.warning(
                    f"⚠️ Erreur de connexion SSL lors de l'initialisation (tentative {attempt + 1}/{max_retries + 1}): {e}"
                )
                logger.warning(f"⏳ Attente de {delay:.2f}s avant la prochaine tentative...")
                
                # Invalider le pool AVANT d'attendre pour libérer les ressources
                try:
                    engine.dispose()
                    logger.debug("🔄 Pool de connexions invalidé")
                except Exception as dispose_error:
                    logger.debug(f"⚠️ Erreur lors de l'invalidation du pool: {dispose_error}")
                
                # Attendre avant de réessayer
                time.sleep(delay)
                
                # Augmenter le délai pour la prochaine tentative (backoff exponentiel)
                delay = min(delay * backoff_factor, max_delay)
            
            except Exception as e:
                # Pour les autres erreurs, vérifier si les tables existent déjà
                error_str = str(e).lower()
                if "already exists" in error_str or "duplicate" in error_str:
                    logger.info("✅ Les tables semblent déjà exister. Initialisation non nécessaire.")
                    return
                
                # Vérifier si les tables existent
                try:
                    from sqlalchemy import inspect
                    inspector = inspect(engine)
                    existing_tables = inspector.get_table_names()
                    if existing_tables:
                        logger.info(f"✅ Les tables existent déjà ({len(existing_tables)} table(s)). L'application peut démarrer.")
                        return
                except Exception:
                    pass
                
                # Si on ne peut pas vérifier, logger l'erreur mais ne pas faire échouer le démarrage
                logger.warning(f"⚠️ Erreur lors de l'initialisation: {e}. L'application va continuer le démarrage.")
                return  # Ne pas lever d'exception pour permettre le démarrage
        
        # Si on arrive ici après toutes les tentatives, vérifier une dernière fois
        if last_exception:
            try:
                from sqlalchemy import inspect
                inspector = inspect(engine)
                existing_tables = inspector.get_table_names()
                if existing_tables:
                    logger.info(f"✅ Les tables existent déjà ({len(existing_tables)} table(s)). L'application peut démarrer.")
                    return
            except Exception:
                pass
            
            logger.warning(f"⚠️ Impossible d'initialiser après toutes les tentatives: {last_exception}")
            logger.warning("⚠️ L'application va continuer le démarrage. Les tables peuvent exister déjà.")
            return  # Ne pas lever d'exception

