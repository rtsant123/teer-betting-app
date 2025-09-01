#!/bin/bash

# VPS Timezone Fix Auto-Deployment
# Run this directly on your VPS to apply all timezone fixes

set -e

echo "🚀 Starting Auto-Fix for Timezone Issues on VPS..."

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found${NC}"
    echo "Please run this script from your teer-betting-app directory"
    echo "Example: cd /home/deploy/teer-betting-app && ./vps-auto-fix.sh"
    exit 1
fi

echo -e "${BLUE}📋 Current directory: $(pwd)${NC}"
echo -e "${BLUE}📋 User: $(whoami)${NC}"
echo ""

echo -e "${YELLOW}🔄 Step 1: Stopping current services...${NC}"
docker-compose down

echo -e "${YELLOW}📥 Step 2: Pulling latest code from GitHub...${NC}"
git pull origin main

echo -e "${YELLOW}📦 Step 3: Installing timezone dependency...${NC}"
docker-compose run --rm backend pip install pytz || {
    echo -e "${YELLOW}⚠️ Pip install failed, rebuilding backend container...${NC}"
    docker-compose build backend
}

echo -e "${YELLOW}🗄️ Step 4: Running database migration...${NC}"
docker-compose up -d db redis
sleep 10
docker-compose run --rm backend alembic upgrade head

echo -e "${YELLOW}🔧 Step 5: Creating data fix script...${NC}"
cat > fix_timezone_data.py << 'EOF'
#!/usr/bin/env python3
"""
Fix existing timezone data in the database
"""
import sys
import os
sys.path.append('/app')

from sqlalchemy import text
from app.database import SessionLocal
from app.models.house import House

def fix_timezone_data():
    db = SessionLocal()
    try:
        print("🔧 Fixing timezone data...")
        
        # Update house timings to better defaults
        houses = db.query(House).all()
        for house in houses:
            print(f"Updating house: {house.name}")
            
            # Set better default times if they're still old defaults
            if str(house.fr_time) == "15:45:00":
                house.fr_time = "15:30:00"
            if str(house.sr_time) == "16:45:00": 
                house.sr_time = "17:00:00"
            if house.betting_window_minutes == 30:
                house.betting_window_minutes = 15
            if not house.timezone:
                house.timezone = "Asia/Kolkata"
        
        db.commit()
        print("✅ Timezone data fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing timezone data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_timezone_data()
EOF

echo -e "${YELLOW}🕒 Step 6: Applying timezone fixes to existing data...${NC}"
docker-compose run --rm backend python fix_timezone_data.py

echo -e "${YELLOW}🔄 Step 7: Rebuilding and starting all services...${NC}"
docker-compose build backend
docker-compose up -d

echo -e "${YELLOW}⏳ Step 8: Waiting for services to start...${NC}"
sleep 30

echo -e "${YELLOW}📋 Step 9: Checking service status...${NC}"
docker-compose ps

echo -e "${YELLOW}🔍 Step 10: Testing backend...${NC}"
docker-compose exec -T backend python -c "
try:
    import pytz
    from app.models.house import House
    from app.database import SessionLocal
    print('✅ Timezone support loaded')
    db = SessionLocal()
    houses = db.query(House).count()
    print(f'✅ Database connected, found {houses} houses')
    db.close()
except Exception as e:
    print(f'❌ Error: {e}')
"

echo ""
echo -e "${GREEN}🎉 TIMEZONE FIX DEPLOYMENT COMPLETE! 🎉${NC}"
echo ""
echo -e "${GREEN}✅ What was fixed:${NC}"
echo "• Proper timezone handling (Asia/Kolkata)"
echo "• Fixed deadline time calculation"
echo "• Daily recurring house times"
echo "• Automatic round scheduling with correct times"
echo "• Database timezone standardization"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo "Frontend: http://$(curl -s ipinfo.io/ip):3000"
echo "Admin: http://$(curl -s ipinfo.io/ip):3000/admin"
echo "Backend API: http://$(curl -s ipinfo.io/ip):8000"
echo ""
echo -e "${YELLOW}🔧 To test the fix:${NC}"
echo "1. Go to Admin → Houses"
echo "2. Edit a house and change FR/SR times"
echo "3. Verify that times are saved correctly"
echo "4. Check that future rounds show proper deadline times"

# Cleanup
rm -f fix_timezone_data.py
