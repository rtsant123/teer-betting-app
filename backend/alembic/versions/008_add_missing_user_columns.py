"""add missing user referral columns

Revision ID: 008_add_missing_user_columns
Revises: 007_add_referral_system_fixed
Create Date: 2025-08-13 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_add_missing_user_columns'
down_revision = '007_add_referral_system_fixed'
branch_labels = None
depends_on = None

def upgrade():
    # Add missing columns to users table
    op.add_column('users', sa.Column('agent_commission_rate', sa.Float(), nullable=True, default=0.0))
    op.add_column('users', sa.Column('total_referrals', sa.Integer(), nullable=True, default=0))
    op.add_column('users', sa.Column('active_referrals', sa.Integer(), nullable=True, default=0))
    op.add_column('users', sa.Column('is_agent_approved', sa.Boolean(), nullable=True, default=False))
    op.add_column('users', sa.Column('agent_approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('agent_notes', sa.Text(), nullable=True))
    
    # Remove the referral_link_id column if it exists (it's not in the current model)
    try:
        op.drop_constraint('fk_users_referral_link', 'users', type_='foreignkey')
        op.drop_column('users', 'referral_link_id')
    except:
        pass  # Column might not exist

def downgrade():
    # Remove the added columns
    op.drop_column('users', 'agent_notes')
    op.drop_column('users', 'agent_approved_at')
    op.drop_column('users', 'is_agent_approved')
    op.drop_column('users', 'active_referrals')
    op.drop_column('users', 'total_referrals')
    op.drop_column('users', 'agent_commission_rate')
