"""Merge heads

Revision ID: 005_merge_heads
Revises: 004_add_house_soft_delete_and_audit_logs, add_scheduling_fields
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_merge_heads'
down_revision = ('004_add_house_soft_delete_and_audit_logs', 'add_scheduling_fields')
branch_labels = None
depends_on = None

def upgrade():
    # This is a merge revision with no changes
    pass

def downgrade():
    # This is a merge revision with no changes
    pass
