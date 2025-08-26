"""Add admin tasks table

Revision ID: 009_add_admin_tasks
Revises: 006_add_forecast_payout_rates
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_add_admin_tasks'
down_revision = '006_add_forecast_payout_rates'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types using raw SQL to avoid issues
    bind = op.get_bind()
    
    # Create enum types with proper exception handling
    bind.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE tasktype AS ENUM ('RESULT_MANAGEMENT', 'PAYMENT_APPROVAL', 'USER_MANAGEMENT', 'HOUSE_MANAGEMENT', 'SYSTEM_MAINTENANCE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    bind.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE taskpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    bind.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE taskstatus AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # Check if table exists before creating it
    result = bind.execute(sa.text("SELECT tablename FROM pg_tables WHERE tablename = 'admin_tasks'"))
    if not result.fetchone():
        # Create admin_tasks table without referencing ENUM objects that auto-create
        bind.execute(sa.text("""
            CREATE TABLE admin_tasks (
                id SERIAL PRIMARY KEY,
                assigned_to_id INTEGER REFERENCES users(id),
                assigned_by_id INTEGER NOT NULL REFERENCES users(id),
                task_type tasktype NOT NULL,
                task_description TEXT NOT NULL,
                priority taskpriority NOT NULL DEFAULT 'MEDIUM',
                status taskstatus NOT NULL DEFAULT 'PENDING',
                due_date TIMESTAMP WITH TIME ZONE,
                completion_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                completed_at TIMESTAMP WITH TIME ZONE
            );
        """))
        
        # Create index
        bind.execute(sa.text("CREATE INDEX ix_admin_tasks_id ON admin_tasks (id);"))

def downgrade():
    # Drop table and index
    bind = op.get_bind()
    bind.execute(sa.text("DROP INDEX IF EXISTS ix_admin_tasks_id;"))
    bind.execute(sa.text("DROP TABLE IF EXISTS admin_tasks;"))
    
    # Drop enum types
    bind.execute(sa.text("DROP TYPE IF EXISTS tasktype;"))
    bind.execute(sa.text("DROP TYPE IF EXISTS taskpriority;")) 
    bind.execute(sa.text("DROP TYPE IF EXISTS taskstatus;"))
