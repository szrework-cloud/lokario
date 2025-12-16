"""add_client_vat_fields

Revision ID: add_client_vat_fields
Revises: fe0f2d5eb7e1
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_client_vat_fields'
down_revision: Union[str, None] = 'fe0f2d5eb7e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter les colonnes pour la gestion TVA et auto-entrepreneurs
    op.add_column('clients', sa.Column('is_auto_entrepreneur', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('clients', sa.Column('vat_exempt', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('clients', sa.Column('vat_exemption_reference', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Supprimer les colonnes ajoutées
    op.drop_column('clients', 'vat_exemption_reference')
    op.drop_column('clients', 'vat_exempt')
    op.drop_column('clients', 'is_auto_entrepreneur')
