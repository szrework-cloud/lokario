"""add_pending_auto_reply_content

Revision ID: add_pending_auto_reply
Revises: 1328646a3b4b
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_pending_auto_reply'
down_revision: Union[str, None] = '1328646a3b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter la colonne pending_auto_reply_content à conversations
    op.add_column('conversations', sa.Column('pending_auto_reply_content', sa.Text(), nullable=True))


def downgrade() -> None:
    # Retirer la colonne pending_auto_reply_content
    op.drop_column('conversations', 'pending_auto_reply_content')

