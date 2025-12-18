from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.base import Base
import logging

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
    if "supabase.com" in settings.DATABASE_URL:
        # Pour Supabase, les connexions SSL peuvent être fermées de manière inattendue
        # Le pool_pre_ping va détecter et recréer les connexions mortes automatiquement
        # Pas besoin de forcer SSL explicitement car le pooler gère ça automatiquement
        pass
    
    engine = create_engine(
        settings.DATABASE_URL,
        # Pool size : nombre de connexions permanentes
        pool_size=10,  # Augmenté de 5 (défaut) à 10
        # Max overflow : connexions supplémentaires autorisées au-delà de pool_size
        max_overflow=20,  # Augmenté de 10 (défaut) à 20 (total max = 30 connexions)
        # Pool timeout : temps d'attente avant d'abandonner si toutes les connexions sont occupées
        pool_timeout=30,  # 30 secondes par défaut
        # Pool recycle : recycler les connexions après ce nombre de secondes (évite les connexions mortes)
        # Réduit à 30 minutes car Supabase peut fermer les connexions inactives plus tôt
        pool_recycle=1800,  # 30 minutes (Supabase peut fermer les connexions inactives)
        # Pool pre ping : vérifier que la connexion est vivante avant de l'utiliser
        # CRUCIAL pour Supabase qui peut fermer les connexions SSL de manière inattendue
        # pool_pre_ping=True fait un SELECT 1 avant chaque utilisation pour détecter les connexions mortes
        pool_pre_ping=True,  # Détecte et recrée automatiquement les connexions mortes
        # Connect args : arguments supplémentaires pour la connexion
        connect_args=connect_args,
        echo=False
    )
    logger.info(f"📊 Pool de connexions configuré: pool_size=10, max_overflow=20, pool_recycle=1800 (30min), pool_pre_ping=True")

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
    """Initialise la base de données en créant toutes les tables."""
    Base.metadata.create_all(bind=engine)

