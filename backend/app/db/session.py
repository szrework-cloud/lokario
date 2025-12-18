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
    engine = create_engine(
        settings.DATABASE_URL,
        # Pool size : nombre de connexions permanentes
        pool_size=10,  # Augmenté de 5 (défaut) à 10
        # Max overflow : connexions supplémentaires autorisées au-delà de pool_size
        max_overflow=20,  # Augmenté de 10 (défaut) à 20 (total max = 30 connexions)
        # Pool timeout : temps d'attente avant d'abandonner si toutes les connexions sont occupées
        pool_timeout=30,  # 30 secondes par défaut
        # Pool recycle : recycler les connexions après ce nombre de secondes (évite les connexions mortes)
        pool_recycle=3600,  # 1 heure (Supabase ferme les connexions inactives après 1h)
        # Pool pre ping : vérifier que la connexion est vivante avant de l'utiliser
        pool_pre_ping=True,  # Important pour Supabase qui peut fermer les connexions
        echo=False
    )
    logger.info(f"📊 Pool de connexions configuré: pool_size=10, max_overflow=20, pool_recycle=3600, pool_pre_ping=True")

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

