"""Add banner visibility

Revision ID: 003_add_banner_visibility
Revises: 002
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_banner_visibility'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add visibility column to banners table
    op.add_column('banners', sa.Column('is_visible', sa.Boolean(), default=True))

def downgrade():
    # Remove visibility column from banners table
    op.drop_column('banners', 'is_visible')
