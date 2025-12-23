"""add_city_postal_code_country_siret_to_clients

Revision ID: add_city_postal_code_country_siret
Revises: a9bd83f2e808
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_city_postal_code_country_siret'
down_revision: Union[str, None] = '69f2b8b467ed'  # Après remove_due_time_from_tasks
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si les colonnes existent déjà
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('clients')] if 'clients' in inspector.get_table_names() else []
    
    # Ajouter les colonnes si elles n'existent pas
    if 'city' not in existing_columns:
        op.add_column('clients', sa.Column('city', sa.String(length=100), nullable=True))
    if 'postal_code' not in existing_columns:
        op.add_column('clients', sa.Column('postal_code', sa.String(length=20), nullable=True))
    if 'country' not in existing_columns:
        op.add_column('clients', sa.Column('country', sa.String(length=100), nullable=True))
    if 'siret' not in existing_columns:
        op.add_column('clients', sa.Column('siret', sa.String(length=14), nullable=True))


def downgrade() -> None:
    # Supprimer les colonnes ajoutées
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('clients')] if 'clients' in inspector.get_table_names() else []
    
    if 'siret' in existing_columns:
        op.drop_column('clients', 'siret')
    if 'country' in existing_columns:
        op.drop_column('clients', 'country')
    if 'postal_code' in existing_columns:
        op.drop_column('clients', 'postal_code')
    if 'city' in existing_columns:
        op.drop_column('clients', 'city')

