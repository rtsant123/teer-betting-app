"""Fix house timing defaults and add timezone support

Revision ID: fix_house_timing
Revises: 
Create Date: 2025-09-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = 'fix_house_timing'
down_revision = None  # Replace with actual previous revision
branch_labels = None
depends_on = None

def upgrade():
    """Update house table with better timing defaults"""
    # Update default values for existing houses
    op.execute("UPDATE houses SET fr_time = '15:30:00' WHERE fr_time = '15:45:00'")
    op.execute("UPDATE houses SET sr_time = '17:00:00' WHERE sr_time = '16:45:00'")
    op.execute("UPDATE houses SET betting_window_minutes = 15 WHERE betting_window_minutes = 30")
    
    # Ensure timezone column exists with proper default
    op.execute("UPDATE houses SET timezone = 'Asia/Kolkata' WHERE timezone IS NULL OR timezone = ''")

def downgrade():
    """Revert timing changes"""
    op.execute("UPDATE houses SET fr_time = '15:45:00' WHERE fr_time = '15:30:00'")
    op.execute("UPDATE houses SET sr_time = '16:45:00' WHERE sr_time = '17:00:00'")
    op.execute("UPDATE houses SET betting_window_minutes = 30 WHERE betting_window_minutes = 15")
