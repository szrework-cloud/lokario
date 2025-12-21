"""add_inbox_models

Revision ID: bf284875ee6a
Revises: 9bae5f6e0708
Create Date: 2025-12-02 22:26:29.902249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf284875ee6a'
down_revision: Union[str, None] = '9bae5f6e0708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vérifier si les tables existent déjà
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Créer la table inbox_folders si elle n'existe pas
    if 'inbox_folders' not in existing_tables:
        op.create_table(
            'inbox_folders',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('color', sa.String(), nullable=True),
            sa.Column('folder_type', sa.String(), nullable=False),
            sa.Column('is_system', sa.Boolean(), nullable=False),
            sa.Column('ai_rules', sa.JSON(), nullable=True),
            sa.Column('auto_reply', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_inbox_folders_company_id'), 'inbox_folders', ['company_id'], unique=False)
    
    # Créer la table conversations si elle n'existe pas
    if 'conversations' not in existing_tables:
        op.create_table(
            'conversations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False),
            sa.Column('client_id', sa.Integer(), nullable=True),
            sa.Column('subject', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=False),
            sa.Column('source', sa.String(), nullable=False),
            sa.Column('folder_id', sa.Integer(), nullable=True),
            sa.Column('assigned_to_id', sa.Integer(), nullable=True),
            sa.Column('ai_classified', sa.Boolean(), nullable=False),
            sa.Column('classification_confidence', sa.Integer(), nullable=True),
            sa.Column('auto_reply_sent', sa.Boolean(), nullable=False),
            sa.Column('auto_reply_pending', sa.Boolean(), nullable=False),
            sa.Column('auto_reply_mode', sa.String(), nullable=True),
            sa.Column('is_urgent', sa.Boolean(), nullable=False),
            sa.Column('unread_count', sa.Integer(), nullable=False),
            sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
            sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
            sa.ForeignKeyConstraint(['folder_id'], ['inbox_folders.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_conversations_company_id'), 'conversations', ['company_id'], unique=False)
        op.create_index(op.f('ix_conversations_client_id'), 'conversations', ['client_id'], unique=False)
        op.create_index(op.f('ix_conversations_folder_id'), 'conversations', ['folder_id'], unique=False)
        op.create_index(op.f('ix_conversations_assigned_to_id'), 'conversations', ['assigned_to_id'], unique=False)
    
    # Créer la table inbox_messages si elle n'existe pas
    if 'inbox_messages' not in existing_tables:
        op.create_table(
            'inbox_messages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('conversation_id', sa.Integer(), nullable=False),
            sa.Column('from_name', sa.String(), nullable=False),
            sa.Column('from_email', sa.String(), nullable=True),
            sa.Column('from_phone', sa.String(), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('source', sa.String(), nullable=False),
            sa.Column('is_from_client', sa.Boolean(), nullable=False),
            sa.Column('read', sa.Boolean(), nullable=False),
            sa.Column('external_id', sa.String(), nullable=True),
            sa.Column('external_metadata', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_inbox_messages_conversation_id'), 'inbox_messages', ['conversation_id'], unique=False)
        op.create_index(op.f('ix_inbox_messages_external_id'), 'inbox_messages', ['external_id'], unique=False)
    
    # Créer la table message_attachments si elle n'existe pas
    if 'message_attachments' not in existing_tables:
        op.create_table(
            'message_attachments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('message_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('file_type', sa.String(), nullable=False),
            sa.Column('file_path', sa.String(), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=False),
            sa.Column('mime_type', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['message_id'], ['inbox_messages.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_message_attachments_message_id'), 'message_attachments', ['message_id'], unique=False)
    
    # Créer la table internal_notes si elle n'existe pas
    if 'internal_notes' not in existing_tables:
        op.create_table(
            'internal_notes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('conversation_id', sa.Integer(), nullable=False),
            sa.Column('author_id', sa.Integer(), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_internal_notes_conversation_id'), 'internal_notes', ['conversation_id'], unique=False)
        op.create_index(op.f('ix_internal_notes_author_id'), 'internal_notes', ['author_id'], unique=False)


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_internal_notes_author_id'), table_name='internal_notes')
    op.drop_index(op.f('ix_internal_notes_conversation_id'), table_name='internal_notes')
    op.drop_table('internal_notes')
    op.drop_index(op.f('ix_message_attachments_message_id'), table_name='message_attachments')
    op.drop_table('message_attachments')
    op.drop_index(op.f('ix_inbox_messages_external_id'), table_name='inbox_messages')
    op.drop_index(op.f('ix_inbox_messages_conversation_id'), table_name='inbox_messages')
    op.drop_table('inbox_messages')
    op.drop_index(op.f('ix_conversations_assigned_to_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_folder_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_client_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_company_id'), table_name='conversations')
    op.drop_table('conversations')
    op.drop_index(op.f('ix_inbox_folders_company_id'), table_name='inbox_folders')
    op.drop_table('inbox_folders')
    # ### end Alembic commands ###
