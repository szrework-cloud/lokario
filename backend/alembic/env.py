from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Importer la configuration et les modèles
from app.core.config import settings
from app.db.base import Base

# Importer tous les modèles pour qu'Alembic puisse les détecter
from app.db.models.user import User  # noqa
from app.db.models.company import Company  # noqa
from app.db.models.company_settings import CompanySettings  # noqa
from app.db.models.client import Client  # noqa
from app.db.models.project import Project, ProjectHistory  # noqa
from app.db.models.billing import Quote, Invoice  # noqa
from app.db.models.document import Document, DocumentFolder, DocumentHistory  # noqa
from app.db.models.followup import FollowUp, FollowUpHistory  # noqa
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InboxFolder, InternalNote  # noqa
from app.db.models.task import Task  # noqa
from app.db.models.inbox_integration import InboxIntegration  # noqa
from app.db.models.chatbot import ChatbotConversation, ChatbotMessage, ChatbotContextCache  # noqa

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Utiliser la DATABASE_URL de l'application
# Éviter l'interpolation ConfigParser en remplaçant % par %%
# car ConfigParser interprète % comme caractère d'interpolation
database_url = settings.DATABASE_URL.replace('%', '%%')
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
