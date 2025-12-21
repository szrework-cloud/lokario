"""add_account_deletion_grace_period

Revision ID: 8647e85819cb
Revises: a9bd83f2e808
Create Date: 2025-01-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8647e85819cb'
down_revision: Union[str, None] = 'a9bd83f2e808'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si les colonnes existent déjà
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'users' in existing_tables:
        existing_columns = [col['name'] for col in inspector.get_columns('users')]
    else:
        existing_columns = []
    
    # Ajouter les colonnes pour la période de grâce de suppression
    if 'deletion_requested_at' not in existing_columns:
        op.add_column('users', sa.Column('deletion_requested_at', sa.DateTime(timezone=True), nullable=True))
    if 'deletion_scheduled_at' not in existing_columns:
        op.add_column('users', sa.Column('deletion_scheduled_at', sa.DateTime(timezone=True), nullable=True))
    
    # Créer un index pour faciliter les requêtes du cron job
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('users')] if 'users' in existing_tables else []
    if 'ix_users_deletion_scheduled_at' not in existing_indexes:
        try:
            op.create_index('ix_users_deletion_scheduled_at', 'users', ['deletion_scheduled_at'], unique=False)
        except Exception:
            pass


def downgrade() -> None:
    # Supprimer l'index
    try:
        op.drop_index('ix_users_deletion_scheduled_at', table_name='users')
    except Exception:
        pass
    
    # Supprimer les colonnes
    try:
        op.drop_column('users', 'deletion_scheduled_at')
    except Exception:
        pass
    try:
        op.drop_column('users', 'deletion_requested_at')
    except Exception:
        pass
