#!/usr/bin/env python3
"""
Create admin user script for production setup
"""

import sys
import os
sys.path.append('/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.models.referral import UserRole
from app.config import settings
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin user if it doesn't exist"""
    
    # Create database connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        
        if admin_user:
            print(f"✅ Admin user already exists: {admin_user.username}")
            print(f"   Phone: {admin_user.phone}")
            return
        
        # Create new admin user with secure password
        admin_username = "admin"
        admin_password = "AdminSecure123!"  # Change this in production!
        admin_phone = "+1234567890"
        admin_email = "admin@teerplatform.com"
        
        hashed_password = pwd_context.hash(admin_password)
        
        new_admin = User(
            username=admin_username,
            phone=admin_phone,
            email=admin_email,
            password_hash=hashed_password,
            is_active=True,
            role=UserRole.ADMIN,
            wallet_balance=0.0,
            referral_code="ADMIN"
        )
        
        db.add(new_admin)
        db.commit()
        
        print("🎉 Admin user created successfully!")
        print(f"   Username: {admin_username}")
        print(f"   Phone: {admin_phone}")
        print(f"   Password: {admin_password}")
        print("\n⚠️  IMPORTANT: Please change the admin password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
