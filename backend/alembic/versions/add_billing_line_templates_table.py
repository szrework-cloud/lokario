"""add_billing_line_templates_table

Revision ID: add_billing_line_templates
Revises: add_quote_lines
Create Date: 2025-01-20 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'add_billing_line_templates'
down_revision: Union[str, None] = 'add_quote_lines'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si la table existe déjà
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Créer la table billing_line_templates si elle n'existe pas
    if 'billing_line_templates' not in existing_tables:
        op.create_table(
            'billing_line_templates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('unit_price_ht', sa.Numeric(10, 2), nullable=False),
            sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_billing_line_templates_id'), 'billing_line_templates', ['id'], unique=False)
        op.create_index(op.f('ix_billing_line_templates_company_id'), 'billing_line_templates', ['company_id'], unique=False)


def downgrade() -> None:
    # Supprimer la table billing_line_templates
    try:
        op.drop_index(op.f('ix_billing_line_templates_company_id'), table_name='billing_line_templates')
        op.drop_index(op.f('ix_billing_line_templates_id'), table_name='billing_line_templates')
        op.drop_table('billing_line_templates')
    except Exception:
        pass

