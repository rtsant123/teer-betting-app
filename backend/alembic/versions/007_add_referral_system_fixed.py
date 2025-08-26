"""Add comprehensive referral and agent system

Revision ID: 007_add_referral_system_fixed
Revises: 005_merge_heads
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_add_referral_system_fixed'
down_revision = '005_merge_heads'
branch_labels = None
depends_on = None

def upgrade():
    # Create enums (check if they exist first)
    connection = op.get_bind()
    
    # Check and create userrole enum
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'userrole'"))
    if not result.fetchone():
        op.execute("CREATE TYPE userrole AS ENUM ('PLAYER', 'AGENT', 'SUPER_AGENT', 'ADMIN')")
    
    # Check and create commissionlevel enum
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'commissionlevel'"))
    if not result.fetchone():
        op.execute("CREATE TYPE commissionlevel AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3')")
    
    # Check and create commissionstatus enum
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'commissionstatus'"))
    if not result.fetchone():
        op.execute("CREATE TYPE commissionstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED')")
    
    # Check and create withdrawalstatus enum
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'withdrawalstatus'"))
    if not result.fetchone():
        op.execute("CREATE TYPE withdrawalstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')")
    
    # Add referral fields to users table
    op.add_column('users', sa.Column('role', postgresql.ENUM('PLAYER', 'AGENT', 'SUPER_AGENT', 'ADMIN', name='userrole', create_type=False), 
                                   nullable=False, server_default='PLAYER'))
    op.add_column('users', sa.Column('referral_code', sa.String(20), unique=True, nullable=True))
    op.add_column('users', sa.Column('referred_by', sa.Integer, sa.ForeignKey('users.id'), nullable=True))
    op.add_column('users', sa.Column('referral_link_id', sa.Integer, nullable=True))
    op.add_column('users', sa.Column('total_commission_earned', sa.Float, default=0.0))
    op.add_column('users', sa.Column('commission_balance', sa.Float, default=0.0))
    
    # Create referral_settings table for dynamic configuration
    op.create_table('referral_settings',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('level_1_rate', sa.Float, default=0.0),
        sa.Column('level_2_rate', sa.Float, default=0.0),
        sa.Column('level_3_rate', sa.Float, default=0.0),
        sa.Column('min_bet_for_commission', sa.Float, default=0.0),
        sa.Column('min_withdrawal_amount', sa.Float, default=100.0),
        sa.Column('max_withdrawal_amount', sa.Float, default=10000.0),
        sa.Column('commission_validity_days', sa.Integer, default=30),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'))
    )
    
    # Create referral_commissions table
    op.create_table('referral_commissions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('referrer_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('referred_user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('bet_id', sa.Integer, sa.ForeignKey('bets.id'), nullable=True),
        sa.Column('level', postgresql.ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', name='commissionlevel', create_type=False), nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('bet_amount', sa.Float, nullable=True),
        sa.Column('commission_rate', sa.Float, nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', name='commissionstatus', create_type=False), default='PENDING'),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Create referral_links table
    op.create_table('referral_links',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('campaign_name', sa.String(100), default='General'),
        sa.Column('click_count', sa.Integer, default=0),
        sa.Column('conversion_count', sa.Integer, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Create commission_withdrawals table
    op.create_table('commission_withdrawals',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', name='withdrawalstatus', create_type=False), default='PENDING'),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('processed_by', sa.Integer, sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add foreign key for referral_link_id in users table
    op.create_foreign_key('fk_users_referral_link', 'users', 'referral_links', ['referral_link_id'], ['id'])
    
    # Create indexes for better performance
    op.create_index('idx_referral_commissions_referrer', 'referral_commissions', ['referrer_id'])
    op.create_index('idx_referral_commissions_referred_user', 'referral_commissions', ['referred_user_id'])
    op.create_index('idx_referral_commissions_status', 'referral_commissions', ['status'])
    op.create_index('idx_referral_links_code', 'referral_links', ['code'])
    op.create_index('idx_referral_links_user', 'referral_links', ['user_id'])
    op.create_index('idx_commission_withdrawals_user', 'commission_withdrawals', ['user_id'])
    op.create_index('idx_commission_withdrawals_status', 'commission_withdrawals', ['status'])

def downgrade():
    # Drop tables
    op.drop_table('commission_withdrawals')
    op.drop_table('referral_links')
    op.drop_table('referral_commissions')
    op.drop_table('referral_settings')
    
    # Drop columns from users table
    op.drop_column('users', 'commission_balance')
    op.drop_column('users', 'total_commission_earned')
    op.drop_column('users', 'referral_link_id')
    op.drop_column('users', 'referred_by')
    op.drop_column('users', 'referral_code')
    op.drop_column('users', 'role')
    
    # Drop enums (only if no other tables use them)
    op.execute("DROP TYPE IF EXISTS withdrawalstatus")
    op.execute("DROP TYPE IF EXISTS commissionstatus")
    op.execute("DROP TYPE IF EXISTS commissionlevel")
    op.execute("DROP TYPE IF EXISTS userrole")
