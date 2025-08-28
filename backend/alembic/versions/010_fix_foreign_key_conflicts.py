"""Fix foreign key conflicts

Revision ID: 010_fix_foreign_key_conflicts
Revises: 009_add_admin_tasks
Create Date: 2025-08-27 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_fix_foreign_key_conflicts'
down_revision = '009_add_admin_tasks'
branch_labels = None
depends_on = None

def upgrade():
    """Fix foreign key constraint conflicts"""
    
    # Drop problematic foreign key constraints if they exist
    try:
        # Check if constraint exists before dropping
        connection = op.get_bind()
        
        # Drop duplicate foreign key constraints on rounds table
        result = connection.execute(sa.text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'rounds' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%round_sr_round_id%'
        """))
        
        constraints = result.fetchall()
        for constraint in constraints:
            try:
                op.drop_constraint(constraint[0], 'rounds', type_='foreignkey')
            except Exception as e:
                print(f"Could not drop constraint {constraint[0]}: {e}")
        
        # Re-create the correct foreign key constraint
        op.create_foreign_key(
            'fk_rounds_sr_round_id',
            'rounds', 'sr_rounds',
            ['sr_round_id'], ['id'],
            ondelete='SET NULL'
        )
        
    except Exception as e:
        print(f"Migration warning: {e}")
        pass

def downgrade():
    """Reverse the foreign key fixes"""
    try:
        op.drop_constraint('fk_rounds_sr_round_id', 'rounds', type_='foreignkey')
    except Exception as e:
        print(f"Downgrade warning: {e}")
        pass
