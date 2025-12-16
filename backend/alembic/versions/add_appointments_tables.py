"""Add appointments and appointment_types tables

Revision ID: add_appointments_tables
Revises: add_recurrence_days_to_tasks
Create Date: 2025-12-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_appointments_tables'
down_revision = 'f7g8h9i0j1k2'  # ID de la révision add_recurrence_days_to_tasks
branch_labels = None
depends_on = None


def upgrade():
    # Créer la table appointment_types
    op.create_table(
        'appointment_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('buffer_before_minutes', sa.Integer(), nullable=True),
        sa.Column('buffer_after_minutes', sa.Integer(), nullable=True),
        sa.Column('employees_allowed_ids', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointment_types_id'), 'appointment_types', ['id'], unique=False)
    op.create_index(op.f('ix_appointment_types_company_id'), 'appointment_types', ['company_id'], unique=False)

    # Créer la table appointments
    op.create_table(
        'appointments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('type_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sa.Integer(), nullable=True),
        sa.Column('start_date_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='scheduled'),
        sa.Column('notes_internal', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['type_id'], ['appointment_types.id'], ),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)
    op.create_index(op.f('ix_appointments_company_id'), 'appointments', ['company_id'], unique=False)
    op.create_index(op.f('ix_appointments_client_id'), 'appointments', ['client_id'], unique=False)
    op.create_index(op.f('ix_appointments_type_id'), 'appointments', ['type_id'], unique=False)
    op.create_index(op.f('ix_appointments_employee_id'), 'appointments', ['employee_id'], unique=False)
    op.create_index(op.f('ix_appointments_conversation_id'), 'appointments', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_appointments_start_date_time'), 'appointments', ['start_date_time'], unique=False)
    op.create_index(op.f('ix_appointments_status'), 'appointments', ['status'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_appointments_status'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_start_date_time'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_conversation_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_employee_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_type_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_client_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_company_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_table('appointments')
    op.drop_index(op.f('ix_appointment_types_company_id'), table_name='appointment_types')
    op.drop_index(op.f('ix_appointment_types_id'), table_name='appointment_types')
    op.drop_table('appointment_types')


