"""add_inbox_integrations_table

Revision ID: f4341aba55a8
Revises: bf284875ee6a
Create Date: 2025-12-02 23:02:43.201202

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4341aba55a8'
down_revision: Union[str, None] = 'bf284875ee6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer la table inbox_integrations
    op.create_table(
        'inbox_integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('integration_type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('imap_server', sa.String(), nullable=True),
        sa.Column('imap_port', sa.Integer(), nullable=True),
        sa.Column('email_address', sa.String(), nullable=True),
        sa.Column('email_password', sa.Text(), nullable=True),
        sa.Column('use_ssl', sa.Boolean(), nullable=False),
        sa.Column('api_key', sa.Text(), nullable=True),
        sa.Column('webhook_url', sa.String(), nullable=True),
        sa.Column('webhook_secret', sa.String(), nullable=True),
        sa.Column('account_id', sa.String(), nullable=True),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_status', sa.String(), nullable=True),
        sa.Column('last_sync_error', sa.Text(), nullable=True),
        sa.Column('sync_interval_minutes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inbox_integrations_company_id'), 'inbox_integrations', ['company_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_inbox_integrations_company_id'), table_name='inbox_integrations')
    op.drop_table('inbox_integrations')
