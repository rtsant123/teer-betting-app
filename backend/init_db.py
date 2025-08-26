"""
Enhanced Database initialization script with comprehensive Teer betting data
Run this script to create initial data for the Teer betting platform
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import User, House, Round
from app.models.round import RoundType, RoundStatus
from app.utils.password import hash_password

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

def create_teer_data():
    """Create comprehensive Teer betting data"""
    db = SessionLocal()
    
    try:
        print("🎯 Creating Teer Betting Platform Data...")
        
        # Create admin user
        admin_user = User(
            username="admin",
            phone="9999999999",
            password_hash=hash_password("admin123"),
            is_active=True,
            is_admin=True,
            wallet_balance=0.0
        )
        db.add(admin_user)
        
        # Create test users with realistic data
        test_users = [
            {
                "username": "player1",
                "phone": "9876543210",
                "password": "test123",
                "balance": 5000.0
            },
            {
                "username": "player2", 
                "phone": "9876543211",
                "password": "test123",
                "balance": 2500.0
            },
            {
                "username": "player3",
                "phone": "9876543212", 
                "password": "test123",
                "balance": 7500.0
            },
            {
                "username": "bigplayer",
                "phone": "9876543213",
                "password": "test123",
                "balance": 15000.0
            },
            {
                "username": "newbie",
                "phone": "9876543214",
                "password": "test123",
                "balance": 500.0
            }
        ]
        
        for user_data in test_users:
            user = User(
                username=user_data["username"],
                phone=user_data["phone"],
                password_hash=hash_password(user_data["password"]),
                is_active=True,
                is_admin=False,
                wallet_balance=user_data["balance"]
            )
            db.add(user)
        
        # Create authentic Teer houses with realistic payout rates
        houses = [
            {
                "name": "Shillong",
                "location": "Meghalaya",
                "fr_direct_payout_rate": 80.0,
                "fr_house_payout_rate": 8.0,
                "fr_ending_payout_rate": 8.0,
                "sr_direct_payout_rate": 70.0,
                "sr_house_payout_rate": 7.0,
                "sr_ending_payout_rate": 7.0,
                "forecast_payout_rate": 400.0
            },
            {
                "name": "Khanapara",
                "location": "Guwahati, Assam",
                "fr_direct_payout_rate": 75.0,
                "fr_house_payout_rate": 7.5,
                "fr_ending_payout_rate": 7.5,
                "sr_direct_payout_rate": 65.0,
                "sr_house_payout_rate": 6.5,
                "sr_ending_payout_rate": 6.5,
                "forecast_payout_rate": 400.0
            },
            {
                "name": "Juwai",
                "location": "West Khasi Hills, Meghalaya",
                "fr_direct_payout_rate": 85.0,
                "fr_house_payout_rate": 8.5,
                "fr_ending_payout_rate": 8.5,
                "sr_direct_payout_rate": 75.0,
                "sr_house_payout_rate": 7.5,
                "sr_ending_payout_rate": 7.5,
                "forecast_payout_rate": 400.0
            },
            {
                "name": "Jowai",
                "location": "West Jaintia Hills, Meghalaya",
                "fr_direct_payout_rate": 82.0,
                "fr_house_payout_rate": 8.2,
                "fr_ending_payout_rate": 8.2,
                "sr_direct_payout_rate": 72.0,
                "sr_house_payout_rate": 7.2,
                "sr_ending_payout_rate": 7.2,
                "forecast_payout_rate": 400.0
            },
            {
                "name": "Bhutan",
                "location": "Bhutan Teer",
                "fr_direct_payout_rate": 78.0,
                "fr_house_payout_rate": 7.8,
                "fr_ending_payout_rate": 7.8,
                "sr_direct_payout_rate": 68.0,
                "sr_house_payout_rate": 6.8,
                "sr_ending_payout_rate": 6.8,
                "forecast_payout_rate": 400.0
            }
        ]
        
        for house_data in houses:
            # Check if house already exists
            existing_house = db.query(House).filter(House.name == house_data["name"]).first()
            if not existing_house:
                house = House(**house_data)
                db.add(house)
        
        db.commit()
        
        # Create realistic round schedule (next 3 days)
        now = datetime.utcnow()
        
        # Get house IDs after commit
        house_objects = db.query(House).all()
        
        rounds_to_create = []
        
        for day_offset in range(3):  # Next 3 days
            base_date = now + timedelta(days=day_offset)
            
            for house in house_objects:
                # Morning rounds (10:30 AM and 11:30 AM)
                fr_morning = base_date.replace(hour=10, minute=30, second=0, microsecond=0)
                sr_morning = base_date.replace(hour=11, minute=30, second=0, microsecond=0)
                
                # Evening rounds (3:30 PM and 4:30 PM)
                fr_evening = base_date.replace(hour=15, minute=30, second=0, microsecond=0)
                sr_evening = base_date.replace(hour=16, minute=30, second=0, microsecond=0)
                
                # Only create future rounds
                round_times = [
                    (fr_morning, RoundType.FR, "Morning FR"),
                    (sr_morning, RoundType.SR, "Morning SR"),
                    (fr_evening, RoundType.FR, "Evening FR"),
                    (sr_evening, RoundType.SR, "Evening SR"),
                ]
                
                for scheduled_time, round_type, description in round_times:
                    if scheduled_time > now:
                        # Betting closes 10 minutes before the round
                        betting_closes = scheduled_time - timedelta(minutes=10)
                        
                        round_obj = Round(
                            house_id=house.id,
                            round_type=round_type,
                            scheduled_time=scheduled_time,
                            betting_closes_at=betting_closes,
                            status=RoundStatus.SCHEDULED
                        )
                        rounds_to_create.append((round_obj, description))
        
        # Add the rounds to database
        for round_obj, description in rounds_to_create:
            db.add(round_obj)
        
        db.commit()
        
        print("✅ Teer betting data created successfully")
        print(f"✅ Created {len(test_users) + 1} users (including admin)")
        print(f"✅ Created {len(houses)} Teer houses")
        print(f"✅ Created {len(rounds_to_create)} upcoming rounds")
        
        # Print login credentials
        print("\n" + "="*60)
        print("🔑 LOGIN CREDENTIALS")
        print("="*60)
        print("Admin User:")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Role: Full admin access")
        print("\nTest Users:")
        for user_data in test_users:
            print(f"  Username: {user_data['username']}")
            print(f"  Password: {user_data['password']}")
            print(f"  Balance: ₹{user_data['balance']:,.2f}")
        
        print(f"\nTeer Houses created:")
        for house_data in houses:
            print(f"  🏠 {house_data['name']} ({house_data['location']})")
            print(f"     FR: Direct {house_data['fr_direct_payout_rate']}x | House/Ending {house_data['fr_house_payout_rate']}x")
            print(f"     SR: Direct {house_data['sr_direct_payout_rate']}x | House/Ending {house_data['sr_house_payout_rate']}x") 
            print(f"     Forecast: {house_data['forecast_payout_rate']}x")
        
        print(f"\n📅 Scheduled {len(rounds_to_create)} rounds over next 3 days")
        print("   • Morning: FR at 10:30 AM, SR at 11:30 AM")
        print("   • Evening: FR at 3:30 PM, SR at 4:30 PM")
        print("   • Betting closes 10 minutes before each round")
        
        print("\n🎯 BETTING GUIDE:")
        print("   • Direct: Exact 2-digit number (80x payout)")
        print("   • House: First digit of result (8x payout)")
        print("   • Ending: Last digit of result (8x payout)")
        print("   • Forecast: FR-SR combination (400x payout)")
        
        print("\n🔮 FORECAST BETTING:")
        print("   • Combine FR and SR results from same house")
        print("   • Example: FR=23, SR=45 → Bet 23-45")
        print("   • Multiple combinations allowed per bet")
        print("   • Highest payout: 400x your bet amount!")
        
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating data: {e}")
        raise
    finally:
        db.close()

def create_sample_results():
    """Create some historical results for demonstration"""
    db = SessionLocal()
    
    try:
        # Create some completed rounds with results from yesterday
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        houses = db.query(House).all()
        
        sample_results = [
            {"time": yesterday.replace(hour=10, minute=30), "type": RoundType.FR, "result": 23},
            {"time": yesterday.replace(hour=11, minute=30), "type": RoundType.SR, "result": 67},
            {"time": yesterday.replace(hour=15, minute=30), "type": RoundType.FR, "result": 45},
            {"time": yesterday.replace(hour=16, minute=30), "type": RoundType.SR, "result": 89},
        ]
        
        for house in houses[:2]:  # Only for first 2 houses
            for result_data in sample_results:
                completed_round = Round(
                    house_id=house.id,
                    round_type=result_data["type"],
                    scheduled_time=result_data["time"],
                    betting_closes_at=result_data["time"] - timedelta(minutes=10),
                    actual_time=result_data["time"],
                    result=result_data["result"],
                    status=RoundStatus.COMPLETED
                )
                db.add(completed_round)
        
        db.commit()
        print("✅ Sample historical results created")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample results: {e}")
    finally:
        db.close()

def main():
    """Main function"""
    print("🎯 Initializing Teer Betting Platform Database...")
    print("=" * 60)
    
    # Create tables
    create_tables()
    
    # Create comprehensive Teer data
    create_teer_data()
    
    # Create sample results
    create_sample_results()
    
    print("\n🎉 TEER BETTING PLATFORM READY!")
    print("=" * 60)
    print("🚀 You can now:")
    print("   1. Start the backend: uvicorn app.main:app --reload")
    print("   2. Start the frontend: npm start")
    print("   3. Access the application at http://localhost:3000")
    print("   4. Login with admin credentials to manage the platform")
    print("   5. Test betting with user accounts")
    print("\n🎯 The platform supports:")
    print("   ✅ All 4 bet types (Direct, House, Ending, Forecast)")
    print("   ✅ Multiple Teer houses with authentic names")
    print("   ✅ Realistic round scheduling")
    print("   ✅ Admin controls for result publishing")
    print("   ✅ Wallet management with deposits/withdrawals")
    print("   ✅ Complete audit trails")
    print("   ✅ Mobile-responsive design")
    print("=" * 60)

if __name__ == "__main__":
    main()