#!/usr/bin/env python3
from app.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # Check existing enum types
    result = conn.execute(sa.text("""
        SELECT typname FROM pg_type 
        WHERE typtype = 'e' 
        ORDER BY typname;
    """))
    print('Existing enum types:')
    for row in result:
        print(f'  {row[0]}')
    
    # Check if admin_tasks table exists
    result = conn.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_tasks'
        );
    """))
    table_exists = result.fetchone()[0]
    print(f'\nadmin_tasks table exists: {table_exists}')
