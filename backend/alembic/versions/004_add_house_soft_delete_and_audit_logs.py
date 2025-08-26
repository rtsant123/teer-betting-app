"""Add house soft delete and audit logs

Revision ID: 004_add_house_soft_delete_and_audit_logs
Revises: 003_add_banner_visibility
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_house_soft_delete_and_audit_logs'
down_revision = '003_add_banner_visibility'
branch_labels = None
depends_on = None

def upgrade():
    # Add soft delete columns to houses table
    op.add_column('houses', sa.Column('is_deleted', sa.Boolean(), default=False))
    op.add_column('houses', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    # Remove soft delete columns from houses table
    op.drop_column('houses', 'is_deleted')
    op.drop_column('houses', 'deleted_at')
