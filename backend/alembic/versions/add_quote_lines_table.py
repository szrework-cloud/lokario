"""add_quote_lines_table

Revision ID: add_quote_lines
Revises: a1b2c3d4e5f6
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'add_quote_lines'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'  # Référence à add_invoice_conformity (renommé)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Obtenir la connexion et l'inspecteur pour vérifier les colonnes existantes
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('quotes')]
    
    # Ajouter le champ conditions à la table quotes si il n'existe pas
    if 'conditions' not in columns:
        op.add_column('quotes', sa.Column('conditions', sa.Text(), nullable=True))
    
    # Ajouter les champs de totaux à la table quotes si ils n'existent pas
    if 'subtotal_ht' not in columns:
        op.add_column('quotes', sa.Column('subtotal_ht', sa.Numeric(10, 2), nullable=True))
    if 'total_tax' not in columns:
        op.add_column('quotes', sa.Column('total_tax', sa.Numeric(10, 2), nullable=True))
    if 'total_ttc' not in columns:
        op.add_column('quotes', sa.Column('total_ttc', sa.Numeric(10, 2), nullable=True))
    
    # Créer la table quote_lines si elle n'existe pas
    try:
        op.create_table(
            'quote_lines',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('quote_id', sa.Integer(), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('quantity', sa.Numeric(10, 3), nullable=False, server_default='1'),
            sa.Column('unit_price_ht', sa.Numeric(10, 2), nullable=False),
            sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False),
            sa.Column('subtotal_ht', sa.Numeric(10, 2), nullable=False),
            sa.Column('tax_amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('total_ttc', sa.Numeric(10, 2), nullable=False),
            sa.Column('order', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_quote_lines_quote_id'), 'quote_lines', ['quote_id'], unique=False)
    except Exception:
        # La table existe peut-être déjà, continuer
        pass
    
    # Note: SQLite ne supporte pas les ENUMs natifs, donc pas besoin de modifier l'enum
    # Le statut 'brouillon' sera stocké comme string dans SQLite


def downgrade() -> None:
    # Supprimer la table quote_lines
    try:
        op.drop_index(op.f('ix_quote_lines_quote_id'), table_name='quote_lines')
        op.drop_table('quote_lines')
    except Exception:
        pass
    
    # Supprimer les colonnes ajoutées (optionnel, peut causer des problèmes si des données existent)
    # op.drop_column('quotes', 'conditions')
    # op.drop_column('quotes', 'subtotal_ht')
    # op.drop_column('quotes', 'total_tax')
    # op.drop_column('quotes', 'total_ttc')
