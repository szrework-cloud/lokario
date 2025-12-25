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
    
    # Configuration SSL pour PostgreSQL/Supabase
    # Détecter si on utilise le pooler (port 6543) ou connexion directe (port 5432)
    is_pooler = ":6543/" in settings.DATABASE_URL or "pooler.supabase.com" in settings.DATABASE_URL
    
    if "supabase.com" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL.lower():
        if is_pooler:
            # Configuration pour pooler Supabase (RECOMMANDÉ pour Railway)
            # Le pooler gère automatiquement IPv4/IPv6, pas besoin de forcer IPv4
            connect_args = {
                "sslmode": "require",
                "connect_timeout": 3,  # Réduit de 5s à 3s pour détecter les problèmes plus rapidement
                "application_name": "lokario_backend",
                "target_session_attrs": "read-write",
            }
            logger.info("🔧 Configuration SSL pour pooler Supabase (sslmode=require, timeout=5s)")
        else:
            # Configuration pour connexion directe (non recommandé avec Railway)
            connect_args = {
                "sslmode": "require",
                "connect_timeout": 3,  # Réduit de 5s à 3s pour détecter les problèmes plus rapidement
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 3,
            }
            logger.warning("⚠️ Connexion directe détectée - peut avoir des problèmes IPv6 avec Railway")
            logger.info("🔧 Configuration SSL pour connexion directe (sslmode=require, timeout=5s)")
    
    # Configuration du pool selon le type de connexion
    if is_pooler:
        # Pooler Supabase : utiliser un QueuePool plus grand pour gérer la charge
        # Augmenté pour éviter les timeouts lors de requêtes simultanées
        pool_size = 10  # Augmenté de 5 à 10
        max_overflow = 20  # Augmenté de 10 à 20 (total max: 30 connexions)
        pool_recycle = 180  # 3 minutes (réduit pour éviter les connexions SSL fermées par Supabase)
        pool_class = QueuePool
        logger.info("🔧 Utilisation de QueuePool avec pooler Supabase (pool_size=10, max_overflow=20, pool_recycle=3min)")
        
        engine = create_engine(
            settings.DATABASE_URL,  # Utiliser l'URL originale (pooler gère IPv4/IPv6)
            poolclass=pool_class,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=15,  # Augmenté de 10 à 15 secondes
            pool_recycle=pool_recycle,
            pool_pre_ping=True,  # Vérifier que les connexions sont valides
            connect_args=connect_args,
            echo=False,
            isolation_level="READ COMMITTED"
        )
    else:
        # Connexion directe : utiliser QueuePool normal
        pool_size = 10
        max_overflow = 20
        pool_recycle = 180  # 3 minutes (réduit pour éviter les connexions SSL fermées)
        pool_class = QueuePool
        
        engine = create_engine(
            settings.DATABASE_URL,  # Utiliser l'URL originale
            poolclass=pool_class,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=30,
            pool_recycle=pool_recycle,
            pool_pre_ping=True,
            connect_args=connect_args,
            echo=False,
            isolation_level="READ COMMITTED"
        )
        logger.info(f"🔧 Utilisation de QueuePool (connexion directe) - pool_size={pool_size}, max_overflow={max_overflow}")
    
    logger.info(f"📊 Pool de connexions configuré: {'NullPool (pooler)' if is_pooler else f'QueuePool (pool_size={pool_size}, max_overflow={max_overflow})'}")

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
        # PostgreSQL : Ne JAMAIS créer les tables au démarrage en production
        # Détecter automatiquement si on est en production :
        # - Si ENVIRONMENT est défini à production → production (PRIORITAIRE)
        # - Si on utilise Supabase (pooler OU directe) → production
        # - Sinon → développement (créer les tables)
        from app.core.config import settings
        
        is_production = False
        
        # PRIORITÉ 1 : Variable d'environnement (la plus fiable)
        if hasattr(settings, 'ENVIRONMENT') and settings.ENVIRONMENT:
            if settings.ENVIRONMENT.lower() in ["production", "prod"]:
                is_production = True
                logger.info("🔍 ENVIRONMENT=production détecté → Mode production")
        
        # PRIORITÉ 2 : Détecter Supabase (pooler OU connexion directe)
        if not is_production:
            is_supabase = (
                "supabase.com" in settings.DATABASE_URL or
                "supabase.co" in settings.DATABASE_URL or
                ":6543/" in settings.DATABASE_URL or
                "pooler.supabase.com" in settings.DATABASE_URL
            )
            if is_supabase:
                is_production = True
                logger.info("🔍 Supabase détecté (pooler ou directe) → Mode production")
        
        if is_production:
            # En production : NE FAIRE AUCUNE REQUÊTE au démarrage
            # Les tables existent déjà, pas besoin de vérifier
            # Les requêtes suivantes fonctionneront avec le retry automatique
            logger.info("✅ Mode production détecté - Pas de vérification DB au démarrage (tables supposées existantes)")
            logger.info("✅ L'application démarre - Les connexions DB seront testées lors de la première requête")
            logger.info(f"✅ DATABASE_URL contient: {'supabase' if 'supabase' in settings.DATABASE_URL else 'autre'}")
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
                delay = min(delay * 2, max_delay)
            
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

