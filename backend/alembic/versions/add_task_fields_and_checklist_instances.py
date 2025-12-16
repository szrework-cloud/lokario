"""add_task_fields_and_checklist_instances

Revision ID: a1b2c3d4e5f6
Revises: 1328646a3b4b
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1328646a3b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter les nouveaux champs à la table tasks
    op.add_column('tasks', sa.Column('priority', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('recurrence', sa.String(), nullable=True, server_default='none'))
    op.add_column('tasks', sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('tasks', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('origin', sa.String(), nullable=True, server_default='manual'))
    op.add_column('tasks', sa.Column('conversation_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('created_by_id', sa.Integer(), nullable=True))
    
    # Créer les index pour les nouveaux champs
    op.create_index(op.f('ix_tasks_conversation_id'), 'tasks', ['conversation_id'], unique=False)
    
    # Créer les foreign keys
    op.create_foreign_key('fk_tasks_conversation_id', 'tasks', 'conversations', ['conversation_id'], ['id'])
    op.create_foreign_key('fk_tasks_created_by_id', 'tasks', 'users', ['created_by_id'], ['id'])
    
    # Ajouter les nouveaux champs à la table checklist_templates
    op.add_column('checklist_templates', sa.Column('recurrence', sa.String(), nullable=True))
    op.add_column('checklist_templates', sa.Column('recurrence_days', sa.Text(), nullable=True))
    op.add_column('checklist_templates', sa.Column('execution_time', sa.String(), nullable=True))
    op.add_column('checklist_templates', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('checklist_templates', sa.Column('default_assigned_to_id', sa.Integer(), nullable=True))
    op.add_column('checklist_templates', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    
    # Créer la foreign key pour default_assigned_to_id
    op.create_foreign_key('fk_checklist_templates_default_assigned_to_id', 'checklist_templates', 'users', ['default_assigned_to_id'], ['id'])
    
    # Créer la table checklist_instances
    op.create_table('checklist_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_items', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='en_cours'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Créer les index pour checklist_instances
    op.create_index(op.f('ix_checklist_instances_template_id'), 'checklist_instances', ['template_id'], unique=False)
    op.create_index(op.f('ix_checklist_instances_company_id'), 'checklist_instances', ['company_id'], unique=False)
    op.create_index(op.f('ix_checklist_instances_assigned_to_id'), 'checklist_instances', ['assigned_to_id'], unique=False)
    
    # Créer les foreign keys pour checklist_instances
    op.create_foreign_key('fk_checklist_instances_template_id', 'checklist_instances', 'checklist_templates', ['template_id'], ['id'])
    op.create_foreign_key('fk_checklist_instances_company_id', 'checklist_instances', 'companies', ['company_id'], ['id'])
    op.create_foreign_key('fk_checklist_instances_assigned_to_id', 'checklist_instances', 'users', ['assigned_to_id'], ['id'])


def downgrade() -> None:
    # Supprimer la table checklist_instances
    op.drop_table('checklist_instances')
    
    # Supprimer les foreign keys et colonnes de checklist_templates
    op.drop_constraint('fk_checklist_templates_default_assigned_to_id', 'checklist_templates', type_='foreignkey')
    op.drop_column('checklist_templates', 'updated_at')
    op.drop_column('checklist_templates', 'default_assigned_to_id')
    op.drop_column('checklist_templates', 'is_active')
    op.drop_column('checklist_templates', 'execution_time')
    op.drop_column('checklist_templates', 'recurrence_days')
    op.drop_column('checklist_templates', 'recurrence')
    
    # Supprimer les foreign keys et colonnes de tasks
    op.drop_constraint('fk_tasks_created_by_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_conversation_id', 'tasks', type_='foreignkey')
    op.drop_index(op.f('ix_tasks_conversation_id'), table_name='tasks')
    op.drop_column('tasks', 'created_by_id')
    op.drop_column('tasks', 'conversation_id')
    op.drop_column('tasks', 'origin')
    op.drop_column('tasks', 'completed_at')
    op.drop_column('tasks', 'is_mandatory')
    op.drop_column('tasks', 'recurrence')
    op.drop_column('tasks', 'priority')

