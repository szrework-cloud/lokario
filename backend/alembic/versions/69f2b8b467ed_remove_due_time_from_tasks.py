"""remove_due_time_from_tasks

Revision ID: 69f2b8b467ed
Revises: 69e5192fb36d
Create Date: 2025-12-22 22:28:58.565449

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69f2b8b467ed'
down_revision: Union[str, None] = '69e5192fb36d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si la colonne existe avant de la supprimer (pour éviter les erreurs si déjà supprimée)
    from sqlalchemy import inspect
    
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Obtenir la liste des colonnes de la table tasks
    columns = [col['name'] for col in inspector.get_columns('tasks')]
    
    # Supprimer la colonne due_time si elle existe
    if 'due_time' in columns:
        op.drop_column('tasks', 'due_time')


def downgrade() -> None:
    # Réajouter la colonne due_time si nécessaire
    op.add_column('tasks', sa.Column('due_time', sa.String(), nullable=True))
