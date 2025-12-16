"""create_tasks_table

Revision ID: d861fea06374
Revises: 1328646a3b4b
Create Date: 2025-01-20 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd861fea06374'
down_revision: Union[str, None] = '1328646a3b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer la table tasks
    # Note: SQLite ne supporte pas les ENUMs natifs, on utilise String à la place
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        
        # Informations de base
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Assignation
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        
        # Relations optionnelles
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sa.Integer(), nullable=True),
        
        # Classification
        sa.Column('type', sa.String(), nullable=False, server_default='Interne'),  # "Interne", "Client", "Fournisseur"
        sa.Column('status', sa.String(), nullable=False, server_default='À faire'),  # "À faire", "En cours", "Terminé", "En retard"
        sa.Column('priority', sa.String(), nullable=True),  # "low", "medium", "high", "critical", "urgent"
        
        # Dates
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_time', sa.String(), nullable=True),  # Format "HH:MM"
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        
        # Métadonnées
        sa.Column('recurrence', sa.String(), nullable=True, server_default='none'),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('origin', sa.String(), nullable=True, server_default='manual'),
        
        # Checklist (optionnel)
        sa.Column('is_checklist_item', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('checklist_template_id', sa.Integer(), nullable=True),
        
        # Création
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Créer les index
    op.create_index(op.f('ix_tasks_company_id'), 'tasks', ['company_id'], unique=False)
    op.create_index(op.f('ix_tasks_assigned_to_id'), 'tasks', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_tasks_client_id'), 'tasks', ['client_id'], unique=False)
    op.create_index(op.f('ix_tasks_project_id'), 'tasks', ['project_id'], unique=False)
    op.create_index(op.f('ix_tasks_conversation_id'), 'tasks', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_tasks_due_date'), 'tasks', ['due_date'], unique=False)


def downgrade() -> None:
    # Supprimer les index
    op.drop_index(op.f('ix_tasks_due_date'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_conversation_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_project_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_client_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_assigned_to_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_company_id'), table_name='tasks')
    
    # Supprimer la table
    op.drop_table('tasks')
