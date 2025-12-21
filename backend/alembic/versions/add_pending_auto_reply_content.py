"""add_pending_auto_reply_content

Revision ID: add_pending_auto_reply
Revises: 1328646a3b4b
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_pending_auto_reply'
down_revision: Union[str, None] = '1328646a3b4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si la colonne existe déjà (pour éviter les erreurs en cas de re-exécution)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Obtenir les colonnes existantes de la table conversations
    if 'conversations' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('conversations')]
        
        # Ajouter la colonne pending_auto_reply_content si elle n'existe pas
        if 'pending_auto_reply_content' not in existing_columns:
            op.add_column('conversations', sa.Column('pending_auto_reply_content', sa.Text(), nullable=True))


def downgrade() -> None:
    # Retirer la colonne pending_auto_reply_content
    op.drop_column('conversations', 'pending_auto_reply_content')

