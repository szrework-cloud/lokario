"""add_is_primary_to_inbox_integrations

Revision ID: 1328646a3b4b
Revises: f4341aba55a8
Create Date: 2025-12-03 06:44:49.769513

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1328646a3b4b'
down_revision: Union[str, None] = 'f4341aba55a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si la colonne existe déjà
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('inbox_integrations')] if 'inbox_integrations' in inspector.get_table_names() else []
    
    # Ajouter la colonne is_primary à inbox_integrations si elle n'existe pas
    if 'is_primary' not in existing_columns:
        op.add_column('inbox_integrations', sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='0'))
    # Par défaut, la première boîte active devient principale (on le fera dans le code si nécessaire)


def downgrade() -> None:
    # Retirer la colonne is_primary
    op.drop_column('inbox_integrations', 'is_primary')
