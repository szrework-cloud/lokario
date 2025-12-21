"""Cleanup unused columns from followups table

Revision ID: cleanup_followups_table
Revises: add_followups_tables
Create Date: 2025-12-09 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'cleanup_followups_table'
down_revision = '1328646a3b4b'  # Révision actuelle dans la base de données
branch_labels = None
depends_on = None


def upgrade():
    """
    Supprime les colonnes inutilisées de la table followups.
    Colonnes à supprimer :
    - project_id (remplacé par source_id)
    - quote_id (remplacé par source_id)
    - invoice_id (remplacé par source_id)
    - message (déplacé vers followup_history)
    - is_automatic (remplacé par auto_enabled)
    - delay_days (remplacé par auto_frequency_days)
    - sent_at (déplacé vers followup_history)
    
    SQLite ne supporte pas DROP COLUMN directement, donc on doit :
    1. Créer une nouvelle table avec la bonne structure
    2. Copier les données
    3. Supprimer l'ancienne table
    4. Renommer la nouvelle table
    """
    
    # Créer la nouvelle table avec la structure correcte
    # Vérifier si la table existe déjà (pour éviter les erreurs en cas de re-exécution)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'followups_new' not in existing_tables:
        op.create_table(
            'followups_new',
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
    
        # Copier les données de l'ancienne table vers la nouvelle
        # Mapper les anciennes colonnes vers les nouvelles
        # Note: Les colonnes auto_* n'existent peut-être pas encore, donc on utilise les anciennes ou des valeurs par défaut
        try:
            op.execute("""
                INSERT INTO followups_new (
                    id, company_id, client_id, type, source_type, source_id, source_label,
                    due_date, actual_date, status, amount,
                    auto_enabled, auto_frequency_days,
                    auto_stop_on_response, auto_stop_on_paid, auto_stop_on_refused,
                    created_by_id, created_at, updated_at
                )
                SELECT 
                    id, company_id, client_id, type, 
                    COALESCE(source_type, 'manual') as source_type,
                    source_id, 
                    COALESCE(source_label, '') as source_label,
                    due_date, actual_date, status, amount,
                    -- Mapper is_automatic vers auto_enabled (ou 0 par défaut)
                    COALESCE(
                        CASE WHEN is_automatic IS NOT NULL THEN is_automatic ELSE 0 END,
                        0
                    ) as auto_enabled,
                    -- Mapper delay_days vers auto_frequency_days
                    delay_days as auto_frequency_days,
                    -- Valeurs par défaut pour auto_stop_*
                    1 as auto_stop_on_response,
                    1 as auto_stop_on_paid,
                    1 as auto_stop_on_refused,
                    NULL as created_by_id,  -- Cette colonne n'existe peut-être pas non plus
                    created_at, updated_at
                FROM followups
            """)
        except Exception:
            # Si la table followups n'existe pas ou si les colonnes n'existent pas, on continue
            pass
        
        # Supprimer les index de l'ancienne table (si elle existe)
        try:
            op.drop_index('ix_followups_id', table_name='followups')
            op.drop_index('ix_followups_company_id', table_name='followups')
            op.drop_index('ix_followups_client_id', table_name='followups')
            op.drop_index('ix_followups_type', table_name='followups')
            op.drop_index('ix_followups_status', table_name='followups')
            op.drop_index('ix_followups_due_date', table_name='followups')
        except Exception:
            pass
        
        # Vérifier si followups_new existe avant de renommer
        if 'followups_new' in existing_tables:
            # Supprimer l'ancienne table (si elle existe)
            try:
                op.drop_table('followups')
            except Exception:
                pass
            
            # Renommer la nouvelle table
            try:
                op.rename_table('followups_new', 'followups')
            except Exception:
                # Si le rename échoue, peut-être que followups_new n'existe plus ou followups existe déjà
                pass
        else:
            # Si followups_new n'existe pas, vérifier si followups a déjà la bonne structure
            # Si oui, on n'a rien à faire (migration déjà appliquée)
            if 'followups' in existing_tables:
                # Vérifier si la table a déjà la structure nettoyée (pas de colonnes is_automatic, delay_days, etc.)
                followups_columns = [col['name'] for col in inspector.get_columns('followups')]
                if 'is_automatic' not in followups_columns and 'delay_days' not in followups_columns:
                    # La table est déjà nettoyée, on n'a rien à faire
                    return
        
        # Recréer les index
        op.create_index(op.f('ix_followups_id'), 'followups', ['id'], unique=False)
        op.create_index(op.f('ix_followups_company_id'), 'followups', ['company_id'], unique=False)
        op.create_index(op.f('ix_followups_client_id'), 'followups', ['client_id'], unique=False)
        op.create_index(op.f('ix_followups_type'), 'followups', ['type'], unique=False)
        op.create_index(op.f('ix_followups_status'), 'followups', ['status'], unique=False)
        op.create_index(op.f('ix_followups_due_date'), 'followups', ['due_date'], unique=False)


def downgrade():
    """
    Restaure les colonnes supprimées (pour rollback si nécessaire).
    Note: Les données des colonnes supprimées seront perdues.
    """
    
    # Créer la table avec l'ancienne structure
    op.create_table(
        'followups_old',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('quote_id', sa.Integer(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='À faire'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('is_automatic', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('delay_days', sa.Integer(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('source_type', sa.String(), nullable=False, server_default='manual'),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('source_label', sa.String(), nullable=False, server_default=''),
        sa.Column('actual_date', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Copier les données (les colonnes supprimées seront NULL)
    op.execute("""
        INSERT INTO followups_old (
            id, company_id, client_id, project_id, quote_id, invoice_id,
            type, status, due_date, amount, message, is_automatic, delay_days, sent_at,
            created_at, updated_at, source_type, source_id, source_label, actual_date
        )
        SELECT 
            id, company_id, client_id, NULL as project_id, NULL as quote_id, NULL as invoice_id,
            type, status, due_date, amount, NULL as message,
            COALESCE(auto_enabled, 0) as is_automatic,
            auto_frequency_days as delay_days,
            NULL as sent_at,
            created_at, updated_at, source_type, source_id, source_label, actual_date
        FROM followups
    """)
    
    # Supprimer les index
    op.drop_index('ix_followups_due_date', table_name='followups')
    op.drop_index('ix_followups_status', table_name='followups')
    op.drop_index('ix_followups_type', table_name='followups')
    op.drop_index('ix_followups_client_id', table_name='followups')
    op.drop_index('ix_followups_company_id', table_name='followups')
    op.drop_index('ix_followups_id', table_name='followups')
    
    # Supprimer la table actuelle
    op.drop_table('followups')
    
    # Renommer
    op.rename_table('followups_old', 'followups')
    
    # Recréer les index
    op.create_index(op.f('ix_followups_id'), 'followups', ['id'], unique=False)
    op.create_index(op.f('ix_followups_company_id'), 'followups', ['company_id'], unique=False)
    op.create_index(op.f('ix_followups_client_id'), 'followups', ['client_id'], unique=False)
    op.create_index(op.f('ix_followups_type'), 'followups', ['type'], unique=False)
    op.create_index(op.f('ix_followups_status'), 'followups', ['status'], unique=False)
    op.create_index(op.f('ix_followups_due_date'), 'followups', ['due_date'], unique=False)
