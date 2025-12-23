"""merge_client_fields_and_task_removals

Revision ID: merge_client_task_heads
Revises: ('69f2b8b467ed', 'add_city_postal_code_country_siret')
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_client_task_heads'
down_revision: Union[str, tuple] = ('69f2b8b467ed', 'add_city_postal_code_country_siret')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migration de merge - aucune modification nécessaire
    # Les deux branches sont déjà appliquées
    pass


def downgrade() -> None:
    # Migration de merge - aucune modification nécessaire
    pass

