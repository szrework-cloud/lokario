"""add_account_deletion_fields

Revision ID: add_deletion_fields
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_deletion_fields'
down_revision = None  # Mettre à jour avec la dernière migration
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter les colonnes pour la suppression différée
    op.add_column('users', sa.Column('deletion_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deletion_scheduled_at', sa.DateTime(timezone=True), nullable=True))
    
    # Créer un index pour les requêtes de suppression programmée
    op.create_index('ix_users_deletion_scheduled_at', 'users', ['deletion_scheduled_at'])


def downgrade():
    # Supprimer l'index
    op.drop_index('ix_users_deletion_scheduled_at', table_name='users')
    
    # Supprimer les colonnes
    op.drop_column('users', 'deletion_scheduled_at')
    op.drop_column('users', 'deletion_requested_at')

