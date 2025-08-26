"""Add separate forecast payout rates

Revision ID: 006_add_forecast_payout_rates
Revises: 005_merge_heads
Create Date: 2025-08-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '006_add_forecast_payout_rates'
down_revision = '005_merge_heads'
branch_labels = None
depends_on = None


def upgrade():
    # Add new forecast payout rate columns
    op.add_column('houses', sa.Column('forecast_direct_payout_rate', sa.Float(), default=400.0))
    op.add_column('houses', sa.Column('forecast_house_payout_rate', sa.Float(), default=40.0))
    op.add_column('houses', sa.Column('forecast_ending_payout_rate', sa.Float(), default=40.0))
    
    # Update existing houses with default values
    connection = op.get_bind()
    connection.execute(
        sa.text("""
        UPDATE houses 
        SET forecast_direct_payout_rate = 400.0,
            forecast_house_payout_rate = 40.0,
            forecast_ending_payout_rate = 40.0
        WHERE forecast_direct_payout_rate IS NULL
        """)
    )


def downgrade():
    # Remove the new columns
    op.drop_column('houses', 'forecast_ending_payout_rate')
    op.drop_column('houses', 'forecast_house_payout_rate') 
    op.drop_column('houses', 'forecast_direct_payout_rate')
