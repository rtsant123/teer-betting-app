"""Add scheduling fields to houses

Revision ID: add_scheduling_fields
Revises: 
Create Date: 2024-08-08 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIME


# revision identifiers, used by Alembic.
revision = 'add_scheduling_fields'
down_revision = '003_add_banner_visibility'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to houses table
    op.add_column('houses', sa.Column('fr_time', TIME(), nullable=True))
    op.add_column('houses', sa.Column('sr_time', TIME(), nullable=True))
    op.add_column('houses', sa.Column('betting_window_minutes', sa.Integer(), nullable=True, default=5))
    op.add_column('houses', sa.Column('runs_monday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_tuesday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_wednesday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_thursday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_friday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_saturday', sa.Boolean(), nullable=True, default=True))
    op.add_column('houses', sa.Column('runs_sunday', sa.Boolean(), nullable=True, default=True))


def downgrade():
    # Remove the columns
    op.drop_column('houses', 'runs_sunday')
    op.drop_column('houses', 'runs_saturday')
    op.drop_column('houses', 'runs_friday')
    op.drop_column('houses', 'runs_thursday')
    op.drop_column('houses', 'runs_wednesday')
    op.drop_column('houses', 'runs_tuesday')
    op.drop_column('houses', 'runs_monday')
    op.drop_column('houses', 'betting_window_minutes')
    op.drop_column('houses', 'sr_time')
    op.drop_column('houses', 'fr_time')
