"""add_invoice_conformity

Revision ID: a1b2c3d4e5f6
Revises: 1328646a3b4b
Create Date: 2025-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1328646a3b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer la table invoice_lines
    op.create_table(
        'invoice_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 3), nullable=False, server_default='1'),
        sa.Column('unit_price_ht', sa.Numeric(10, 2), nullable=False),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False),
        sa.Column('subtotal_ht', sa.Numeric(10, 2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('total_ttc', sa.Numeric(10, 2), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_lines_invoice_id'), 'invoice_lines', ['invoice_id'], unique=False)
    
    # Créer la table invoice_audit_logs
    op.create_table(
        'invoice_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_audit_logs_invoice_id'), 'invoice_audit_logs', ['invoice_id'], unique=False)
    op.create_index(op.f('ix_invoice_audit_logs_user_id'), 'invoice_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_invoice_audit_logs_timestamp'), 'invoice_audit_logs', ['timestamp'], unique=False)
    
    # Modifier l'enum InvoiceStatus pour ajouter BROUILLON
    # Note: PostgreSQL nécessite de créer un nouveau type et de migrer les données
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'brouillon'")
    op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'annulée'")
    
    # Ajouter le type invoice_type (FACTURE, AVOIR)
    op.execute("CREATE TYPE invoicetype AS ENUM ('facture', 'avoir')")
    
    # Ajouter toutes les nouvelles colonnes à la table invoices
    op.add_column('invoices', sa.Column('invoice_type', sa.Enum('facture', 'avoir', name='invoicetype'), nullable=False, server_default='facture'))
    op.add_column('invoices', sa.Column('original_invoice_id', sa.Integer(), nullable=True))
    op.add_column('invoices', sa.Column('credit_amount', sa.Numeric(10, 2), nullable=True))
    
    # Informations vendeur
    op.add_column('invoices', sa.Column('seller_name', sa.String(length=255), nullable=True))
    op.add_column('invoices', sa.Column('seller_address', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('seller_siren', sa.String(length=9), nullable=True))
    op.add_column('invoices', sa.Column('seller_siret', sa.String(length=14), nullable=True))
    op.add_column('invoices', sa.Column('seller_vat_number', sa.String(length=20), nullable=True))
    op.add_column('invoices', sa.Column('seller_rcs', sa.String(length=100), nullable=True))
    op.add_column('invoices', sa.Column('seller_legal_form', sa.String(length=100), nullable=True))
    op.add_column('invoices', sa.Column('seller_capital', sa.Numeric(15, 2), nullable=True))
    
    # Informations client étendues
    op.add_column('invoices', sa.Column('client_name', sa.String(length=255), nullable=True))
    op.add_column('invoices', sa.Column('client_address', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('client_siren', sa.String(length=9), nullable=True))
    op.add_column('invoices', sa.Column('client_delivery_address', sa.Text(), nullable=True))
    
    # Dates
    op.add_column('invoices', sa.Column('issue_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('sale_date', sa.DateTime(timezone=True), nullable=True))
    
    # Totaux détaillés (remplacer amount par subtotal_ht, total_tax, total_ttc)
    op.add_column('invoices', sa.Column('subtotal_ht', sa.Numeric(10, 2), nullable=True))
    op.add_column('invoices', sa.Column('total_tax', sa.Numeric(10, 2), nullable=True))
    op.add_column('invoices', sa.Column('total_ttc', sa.Numeric(10, 2), nullable=True))
    
    # Migrer les données existantes : copier amount vers total_ttc et calculer subtotal_ht et total_tax
    op.execute("""
        UPDATE invoices 
        SET total_ttc = amount,
            subtotal_ht = amount / 1.20,
            total_tax = amount - (amount / 1.20)
        WHERE total_ttc IS NULL
    """)
    
    # Conditions
    op.add_column('invoices', sa.Column('payment_terms', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('late_penalty_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('invoices', sa.Column('recovery_fee', sa.Numeric(10, 2), nullable=True))
    
    # Mentions spéciales
    op.add_column('invoices', sa.Column('vat_on_debit', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('invoices', sa.Column('vat_exemption_reference', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('operation_category', sa.String(length=50), nullable=True))
    op.add_column('invoices', sa.Column('vat_applicable', sa.Boolean(), nullable=False, server_default='true'))
    
    # Archivage
    op.add_column('invoices', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('archived_by_id', sa.Integer(), nullable=True))
    
    # Soft delete
    op.add_column('invoices', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('deleted_by_id', sa.Integer(), nullable=True))
    
    # Ajouter contraintes de clé étrangère
    op.create_foreign_key('fk_invoices_original_invoice', 'invoices', 'invoices', ['original_invoice_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_invoices_archived_by', 'invoices', 'users', ['archived_by_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_invoices_deleted_by', 'invoices', 'users', ['deleted_by_id'], ['id'], ondelete='SET NULL')
    
    # Ajouter index
    op.create_index(op.f('ix_invoices_original_invoice_id'), 'invoices', ['original_invoice_id'], unique=False)
    op.create_index(op.f('ix_invoices_invoice_type'), 'invoices', ['invoice_type'], unique=False)
    op.create_index(op.f('ix_invoices_archived_at'), 'invoices', ['archived_at'], unique=False)
    op.create_index(op.f('ix_invoices_deleted_at'), 'invoices', ['deleted_at'], unique=False)


def downgrade() -> None:
    # Supprimer les index
    op.drop_index(op.f('ix_invoices_deleted_at'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_archived_at'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_invoice_type'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_original_invoice_id'), table_name='invoices')
    
    # Supprimer les contraintes de clé étrangère
    op.drop_constraint('fk_invoices_deleted_by', 'invoices', type_='foreignkey')
    op.drop_constraint('fk_invoices_archived_by', 'invoices', type_='foreignkey')
    op.drop_constraint('fk_invoices_original_invoice', 'invoices', type_='foreignkey')
    
    # Supprimer les colonnes ajoutées
    op.drop_column('invoices', 'deleted_by_id')
    op.drop_column('invoices', 'deleted_at')
    op.drop_column('invoices', 'archived_by_id')
    op.drop_column('invoices', 'archived_at')
    op.drop_column('invoices', 'vat_applicable')
    op.drop_column('invoices', 'operation_category')
    op.drop_column('invoices', 'vat_exemption_reference')
    op.drop_column('invoices', 'vat_on_debit')
    op.drop_column('invoices', 'recovery_fee')
    op.drop_column('invoices', 'late_penalty_rate')
    op.drop_column('invoices', 'payment_terms')
    op.drop_column('invoices', 'total_ttc')
    op.drop_column('invoices', 'total_tax')
    op.drop_column('invoices', 'subtotal_ht')
    op.drop_column('invoices', 'sale_date')
    op.drop_column('invoices', 'issue_date')
    op.drop_column('invoices', 'client_delivery_address')
    op.drop_column('invoices', 'client_siren')
    op.drop_column('invoices', 'client_address')
    op.drop_column('invoices', 'client_name')
    op.drop_column('invoices', 'seller_capital')
    op.drop_column('invoices', 'seller_legal_form')
    op.drop_column('invoices', 'seller_rcs')
    op.drop_column('invoices', 'seller_vat_number')
    op.drop_column('invoices', 'seller_siret')
    op.drop_column('invoices', 'seller_siren')
    op.drop_column('invoices', 'seller_address')
    op.drop_column('invoices', 'seller_name')
    op.drop_column('invoices', 'credit_amount')
    op.drop_column('invoices', 'original_invoice_id')
    op.drop_column('invoices', 'invoice_type')
    
    # Supprimer le type enum
    op.execute("DROP TYPE IF EXISTS invoicetype")
    
    # Supprimer les tables
    op.drop_index(op.f('ix_invoice_audit_logs_timestamp'), table_name='invoice_audit_logs')
    op.drop_index(op.f('ix_invoice_audit_logs_user_id'), table_name='invoice_audit_logs')
    op.drop_index(op.f('ix_invoice_audit_logs_invoice_id'), table_name='invoice_audit_logs')
    op.drop_table('invoice_audit_logs')
    
    op.drop_index(op.f('ix_invoice_lines_invoice_id'), table_name='invoice_lines')
    op.drop_table('invoice_lines')
    
    # Note: On ne peut pas supprimer les valeurs d'enum ajoutées en PostgreSQL facilement
    # Il faudrait recréer le type complet, ce qui est complexe
