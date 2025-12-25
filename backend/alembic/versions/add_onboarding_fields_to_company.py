"""add_onboarding_fields_to_company

Revision ID: add_onboarding_fields
Revises: aeb521bd56a7
Create Date: 2025-12-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'add_onboarding_fields'
down_revision: Union[str, None] = 'aeb521bd56a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si les colonnes existent déjà
    conn = op.get_bind()
    inspector = inspect(conn)
    
    if 'companies' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('companies')]
        
        # Ajouter onboarding_completed
        if 'onboarding_completed' not in existing_columns:
            op.add_column('companies', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'))
        
        # Ajouter discovery_source
        if 'discovery_source' not in existing_columns:
            op.add_column('companies', sa.Column('discovery_source', sa.String(), nullable=True))
        
        # Ajouter onboarding_motivation
        if 'onboarding_motivation' not in existing_columns:
            op.add_column('companies', sa.Column('onboarding_motivation', sa.String(), nullable=True))


def downgrade() -> None:
    # Supprimer les colonnes
    op.drop_column('companies', 'onboarding_motivation')
    op.drop_column('companies', 'discovery_source')
    op.drop_column('companies', 'onboarding_completed')

