"""merge_quotes_constraint_and_client_task_heads

Revision ID: 8d8d12c59a28
Revises: fix_quotes_number_unique, merge_client_task_heads
Create Date: 2025-12-23 20:43:47.505794

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d8d12c59a28'
down_revision: Union[str, None] = ('fix_quotes_number_unique', 'merge_client_task_heads')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
