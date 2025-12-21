"""Add followups and followup_history tables

Revision ID: add_followups_tables
Revises: add_appointments_tables
Create Date: 2025-12-09 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_followups_tables'
down_revision = 'add_appointments_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Créer la table followups
    op.create_table(
        'followups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('source_type', sa.String(), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('source_label', sa.String(), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='À faire'),
        sa.Column('amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('auto_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('auto_frequency_days', sa.Integer(), nullable=True),
        sa.Column('auto_stop_on_response', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('auto_stop_on_paid', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('auto_stop_on_refused', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_followups_id'), 'followups', ['id'], unique=False)
    op.create_index(op.f('ix_followups_company_id'), 'followups', ['company_id'], unique=False)
    op.create_index(op.f('ix_followups_client_id'), 'followups', ['client_id'], unique=False)
    op.create_index(op.f('ix_followups_type'), 'followups', ['type'], unique=False)
    op.create_index(op.f('ix_followups_status'), 'followups', ['status'], unique=False)
    op.create_index(op.f('ix_followups_due_date'), 'followups', ['due_date'], unique=False)
    
    # Créer la table followup_history
    op.create_table(
        'followup_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('followup_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='envoyé'),
        sa.Column('sent_by_id', sa.Integer(), nullable=True),
        sa.Column('sent_by_name', sa.String(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['followup_id'], ['followups.id'], ),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['sent_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_followup_history_id'), 'followup_history', ['id'], unique=False)
    op.create_index(op.f('ix_followup_history_followup_id'), 'followup_history', ['followup_id'], unique=False)
    op.create_index(op.f('ix_followup_history_company_id'), 'followup_history', ['company_id'], unique=False)
    op.create_index(op.f('ix_followup_history_sent_at'), 'followup_history', ['sent_at'], unique=False)
    op.create_index(op.f('ix_followup_history_conversation_id'), 'followup_history', ['conversation_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_followup_history_conversation_id'), table_name='followup_history')
    op.drop_index(op.f('ix_followup_history_sent_at'), table_name='followup_history')
    op.drop_index(op.f('ix_followup_history_company_id'), table_name='followup_history')
    op.drop_index(op.f('ix_followup_history_followup_id'), table_name='followup_history')
    op.drop_index(op.f('ix_followup_history_id'), table_name='followup_history')
    op.drop_table('followup_history')
    
    op.drop_index(op.f('ix_followups_due_date'), table_name='followups')
    op.drop_index(op.f('ix_followups_status'), table_name='followups')
    op.drop_index(op.f('ix_followups_type'), table_name='followups')
    op.drop_index(op.f('ix_followups_client_id'), table_name='followups')
    op.drop_index(op.f('ix_followups_company_id'), table_name='followups')
    op.drop_index(op.f('ix_followups_id'), table_name='followups')
    op.drop_table('followups')




