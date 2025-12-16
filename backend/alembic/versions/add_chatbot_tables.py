"""Add chatbot tables

Revision ID: add_chatbot_tables
Revises: 1328646a3b4b
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_chatbot_tables'
down_revision = '1328646a3b4b'
branch_labels = None
depends_on = None


def upgrade():
    # Créer la table chatbot_conversations
    op.create_table(
        'chatbot_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chatbot_conversations_id'), 'chatbot_conversations', ['id'], unique=False)
    op.create_index(op.f('ix_chatbot_conversations_company_id'), 'chatbot_conversations', ['company_id'], unique=False)
    op.create_index(op.f('ix_chatbot_conversations_user_id'), 'chatbot_conversations', ['user_id'], unique=False)
    op.create_index('ix_chatbot_conversations_company_user', 'chatbot_conversations', ['company_id', 'user_id'], unique=False)
    op.create_index('ix_chatbot_conversations_last_message_at', 'chatbot_conversations', ['last_message_at'], unique=False)

    # Créer la table chatbot_messages
    op.create_table(
        'chatbot_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(), nullable=True),
        sa.Column('context_snapshot', sa.JSON() if hasattr(sa, 'JSON') else sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['chatbot_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chatbot_messages_id'), 'chatbot_messages', ['id'], unique=False)
    op.create_index(op.f('ix_chatbot_messages_conversation_id'), 'chatbot_messages', ['conversation_id'], unique=False)
    op.create_index('ix_chatbot_messages_created_at', 'chatbot_messages', ['created_at'], unique=False)
    op.create_index('ix_chatbot_messages_conversation_created', 'chatbot_messages', ['conversation_id', 'created_at'], unique=False)

    # Créer la table chatbot_context_cache
    op.create_table(
        'chatbot_context_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('context_data', sa.JSON() if hasattr(sa, 'JSON') else sa.Text(), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id')
    )
    op.create_index(op.f('ix_chatbot_context_cache_id'), 'chatbot_context_cache', ['id'], unique=False)
    op.create_index(op.f('ix_chatbot_context_cache_company_id'), 'chatbot_context_cache', ['company_id'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_chatbot_context_cache_company_id'), table_name='chatbot_context_cache')
    op.drop_index(op.f('ix_chatbot_context_cache_id'), table_name='chatbot_context_cache')
    op.drop_table('chatbot_context_cache')
    
    op.drop_index('ix_chatbot_messages_conversation_created', table_name='chatbot_messages')
    op.drop_index('ix_chatbot_messages_created_at', table_name='chatbot_messages')
    op.drop_index(op.f('ix_chatbot_messages_conversation_id'), table_name='chatbot_messages')
    op.drop_index(op.f('ix_chatbot_messages_id'), table_name='chatbot_messages')
    op.drop_table('chatbot_messages')
    
    op.drop_index('ix_chatbot_conversations_last_message_at', table_name='chatbot_conversations')
    op.drop_index('ix_chatbot_conversations_company_user', table_name='chatbot_conversations')
    op.drop_index(op.f('ix_chatbot_conversations_user_id'), table_name='chatbot_conversations')
    op.drop_index(op.f('ix_chatbot_conversations_company_id'), table_name='chatbot_conversations')
    op.drop_index(op.f('ix_chatbot_conversations_id'), table_name='chatbot_conversations')
    op.drop_table('chatbot_conversations')

