#!/usr/bin/env python3
"""
Cleanup script to remove all demo/test data from the database
Keeps only admin user and cleans up all demo houses, rounds, bets, transactions
"""

import sys
import os
sys.path.append('/app')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import User 
from app.models.house import House
from app.models.round import Round, Result, RoundStatus
from app.models.bet import Bet, BetStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.models.payment_method import PaymentMethod
from app.models.banner import Banner
from app.models.referral import UserRole, Referral
from app.models.otp import OTP
from app.config import settings

def cleanup_demo_data():
    """Clean up all demo data from the database"""
    
    # Create database connection
    print("🔌 Connecting to database...")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("🧹 Starting demo data cleanup...")
        
        # Get admin users to preserve
        admin_users = db.query(User).filter(User.role == UserRole.ADMIN).all()
        admin_ids = [user.id for user in admin_users]
        
        if not admin_users:
            print("⚠️ No admin users found! Creating default admin user...")
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            # Create default admin if none exists
            admin_username = "admin"
            admin_password = "AdminSecure123!"
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
            db.flush()
            admin_ids = [new_admin.id]
            print("✅ Created default admin user")
        else:
            print(f"👤 Found {len(admin_users)} admin users to preserve")
        
        # Disable foreign key checks to avoid issues (SQLite specific)
        try:
            db.execute(text("PRAGMA foreign_keys = OFF;"))
        except Exception:
            pass  # Not SQLite, continue
        
        # Execute deletions in safe order (to avoid foreign key constraints)
        print("\n🗑️ Deleting data in safe order...")
        
        # 1. Delete all OTPs
        otp_count = db.query(OTP).delete(synchronize_session=False)
        print(f"✅ Deleted {otp_count} OTP records")
        
        # 2. Delete all bets
        bet_count = db.query(Bet).delete(synchronize_session=False)
        print(f"✅ Deleted {bet_count} bets")
        
        # 3. Delete all round results
        result_count = db.query(Result).delete(synchronize_session=False)
        print(f"✅ Deleted {result_count} round results")
        
        # 4. Delete all rounds
        round_count = db.query(Round).delete(synchronize_session=False)
        print(f"✅ Deleted {round_count} rounds")
        
        # 5. Delete all transactions (except admin's)
        transaction_count = db.query(Transaction).filter(
            Transaction.user_id.notin_(admin_ids)
        ).delete(synchronize_session=False)
        print(f"✅ Deleted {transaction_count} transactions")
        
        # 6. Delete all referrals
        referral_count = db.query(Referral).delete(synchronize_session=False)
        print(f"✅ Deleted {referral_count} referrals")
        
        # 7. Delete all houses
        house_count = db.query(House).delete(synchronize_session=False)
        print(f"✅ Deleted {house_count} houses")
        
        # 8. Delete all payment methods
        payment_count = db.query(PaymentMethod).delete(synchronize_session=False)
        print(f"✅ Deleted {payment_count} payment methods")
        
        # 9. Delete all banners
        banner_count = db.query(Banner).delete(synchronize_session=False)
        print(f"✅ Deleted {banner_count} banners")
        
        # 10. Delete all non-admin users
        user_count = db.query(User).filter(
            User.id.notin_(admin_ids)
        ).delete(synchronize_session=False)
        print(f"✅ Deleted {user_count} non-admin users")
        
        # 11. Reset admin wallet balances to 0
        for admin_user in admin_users:
            admin_user.wallet_balance = 0.0
            db.add(admin_user)
        print(f"✅ Reset wallet balance to 0 for {len(admin_users)} admin users")
        
        # 12. Reset sequences to start from 1
        print("\n🔄 Resetting database sequences...")
        try:
            # PostgreSQL-specific sequence reset
            sequences_to_reset = [
                'houses_id_seq',
                'rounds_id_seq', 
                'bets_id_seq',
                'transactions_id_seq',
                'payment_methods_id_seq',
                'banners_id_seq',
                'users_id_seq',
                'referrals_id_seq',
                'results_id_seq',
                'otps_id_seq'
            ]
            
            for seq in sequences_to_reset:
                try:
                    db.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1;"))
                    print(f"✅ Reset sequence: {seq}")
                except Exception as e:
                    print(f"⚠️  Could not reset sequence {seq}: {str(e)[:100]}")
        except Exception as e:
            print(f"⚠️  Could not reset sequences: {str(e)[:100]}")
        
        # Commit all changes
        db.commit()
        
        print("\n🎉 Demo data cleanup completed successfully!")
        print(f"👤 Preserved {len(admin_users)} admin users with IDs: {admin_ids}")
        
    except Exception as e:
        print(f"\n❌ Error during cleanup: {str(e)[:200]}")
        db.rollback()
        raise
    finally:
        # Re-enable foreign key checks
        try:
            db.execute(text("PRAGMA foreign_keys = ON;"))
        except Exception:
            pass  # Not SQLite, continue
        
        db.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    cleanup_demo_data()
        print("📊 Summary:")
        print(f"   • Bets deleted: {bet_count}")
        print(f"   • Rounds deleted: {round_count}")
        print(f"   • Transactions deleted: {transaction_count}")
        print(f"   • Houses deleted: {house_count}")
        print(f"   • Users deleted: {user_count}")
        print(f"   • Payment methods deleted: {payment_count}")
        print(f"   • Banners deleted: {banner_count}")
        
        if admin_user:
            print(f"   • Admin user preserved: {admin_user.username}")
        else:
            print("   • No admin user found - you may need to create one")
            
        print("\n💡 Your database is now clean and ready for production!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_demo_data()
