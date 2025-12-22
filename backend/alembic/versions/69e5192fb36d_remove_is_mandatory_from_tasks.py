"""remove_is_mandatory_from_tasks

Revision ID: 69e5192fb36d
Revises: 8647e85819cb
Create Date: 2025-12-22 21:11:57.640569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69e5192fb36d'
down_revision: Union[str, None] = '8647e85819cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si la colonne existe avant de la supprimer (pour éviter les erreurs si déjà supprimée)
    from sqlalchemy import inspect
    from sqlalchemy.engine import reflection
    
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Obtenir la liste des colonnes de la table tasks
    columns = [col['name'] for col in inspector.get_columns('tasks')]
    
    # Supprimer la colonne is_mandatory si elle existe
    if 'is_mandatory' in columns:
        op.drop_column('tasks', 'is_mandatory')


def downgrade() -> None:
    # Réajouter la colonne is_mandatory si nécessaire
    op.add_column('tasks', sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default='false'))
