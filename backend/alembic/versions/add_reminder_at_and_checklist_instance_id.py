"""add_reminder_at_and_checklist_instance_id

Revision ID: e7f8g9h0i1j2
Revises: d861fea06374
Create Date: 2025-01-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7f8g9h0i1j2'
down_revision: Union[str, None] = 'd861fea06374'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter reminder_at à la table tasks
    op.add_column('tasks', sa.Column('reminder_at', sa.DateTime(timezone=True), nullable=True))
    
    # Ajouter checklist_instance_id à la table tasks
    op.add_column('tasks', sa.Column('checklist_instance_id', sa.Integer(), nullable=True))
    
    # Créer l'index pour checklist_instance_id
    op.create_index(op.f('ix_tasks_checklist_instance_id'), 'tasks', ['checklist_instance_id'], unique=False)
    
    # Créer la foreign key pour checklist_instance_id
    # Note: SQLite a des limitations avec ALTER TABLE, donc on utilise try/except
    try:
        op.create_foreign_key(
            'fk_tasks_checklist_instance_id',
            'tasks',
            'checklist_instances',
            ['checklist_instance_id'],
            ['id']
        )
    except Exception:
        # SQLite peut ne pas supporter les foreign keys dans ALTER TABLE
        # La contrainte sera gérée par SQLAlchemy au niveau application
        pass


def downgrade() -> None:
    # Supprimer la foreign key
    try:
        op.drop_constraint('fk_tasks_checklist_instance_id', 'tasks', type_='foreignkey')
    except Exception:
        pass
    
    # Supprimer l'index
    op.drop_index(op.f('ix_tasks_checklist_instance_id'), table_name='tasks')
    
    # Supprimer les colonnes
    op.drop_column('tasks', 'checklist_instance_id')
    op.drop_column('tasks', 'reminder_at')
