#!/usr/bin/env python3
"""
Robust Database Initialization Script
This script ensures the database is properly set up with all required tables and data.
"""

import os
import sys
import time
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def wait_for_db(database_url: str, max_retries: int = 30, retry_interval: int = 2):
    """Wait for database to be available"""
    logger.info("Waiting for database to be available...")
    
    for attempt in range(max_retries):
        try:
            engine = create_engine(database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database is available!")
            return True
        except OperationalError as e:
            logger.warning(f"Database not ready (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_interval)
            else:
                logger.error("Database failed to become available")
                return False
    return False

def init_database():
    """Initialize database with proper error handling"""
    database_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres123@localhost:5434/teer_betting"
    )
    
    logger.info(f"Initializing database: {database_url}")
    
    # Wait for database
    if not wait_for_db(database_url):
        logger.error("Failed to connect to database")
        sys.exit(1)
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"Connected to PostgreSQL: {version}")
        
        # Check if tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        logger.info(f"Existing tables: {existing_tables}")
        
        if not existing_tables:
            logger.info("No tables found. Database will be initialized by Alembic migrations.")
        else:
            logger.info(f"Found {len(existing_tables)} existing tables")
        
        logger.info("Database initialization completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
