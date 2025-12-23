"""merge_client_fields_and_task_removals

Revision ID: merge_client_task_heads
Revises: ('69f2b8b467ed', 'add_city_postal_code_country_siret')
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
# NOTE: Cette migration de merge n'est plus nécessaire car add_city_postal_code_country_siret
# part maintenant directement de 69f2b8b467ed, créant une chaîne linéaire.
# Cette migration peut être supprimée si elle n'a pas encore été appliquée.
revision: str = 'merge_client_task_heads'
down_revision: Union[str, tuple] = 'add_city_postal_code_country_siret'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migration de merge - aucune modification nécessaire
    # Les deux branches sont déjà appliquées
    pass


def downgrade() -> None:
    # Migration de merge - aucune modification nécessaire
    pass

