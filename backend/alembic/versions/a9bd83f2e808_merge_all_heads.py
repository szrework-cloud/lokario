"""merge_all_heads

Revision ID: a9bd83f2e808
Revises: add_billing_line_templates, add_chatbot_tables, add_client_vat_fields, add_notifications_table, e7f8g9h0i1j2, cleanup_followups_table
Create Date: 2025-12-21 11:25:46.364530

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9bd83f2e808'
down_revision: Union[str, None] = ('add_billing_line_templates', 'add_chatbot_tables', 'add_client_vat_fields', 'add_notifications_table', 'e7f8g9h0i1j2', 'cleanup_followups_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
