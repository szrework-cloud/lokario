"""add_recurrence_days_to_tasks

Revision ID: f7g8h9i0j1k2
Revises: add_pending_auto_reply
Create Date: 2025-01-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7g8h9i0j1k2'
down_revision: Union[str, None] = 'add_pending_auto_reply'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter recurrence_days à la table tasks (Text pour stocker JSON)
    op.add_column('tasks', sa.Column('recurrence_days', sa.Text(), nullable=True))


def downgrade() -> None:
    # Supprimer la colonne
    op.drop_column('tasks', 'recurrence_days')

