#!/bin/bash

# VPS Timezone Fix - Works with ROOT or DEPLOY user
# Auto-detects user and adjusts paths accordingly

set -e

echo "🚀 Starting Auto-Fix for Timezone Issues..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect current user and set paths
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" = "root" ]; then
    APP_DIR="/home/deploy/teer-betting-app"
    DEPLOY_USER="deploy"
    echo -e "${BLUE}👑 Running as ROOT user${NC}"
    echo -e "${BLUE}📁 App directory: $APP_DIR${NC}"
else
    APP_DIR="$(pwd)"
    DEPLOY_USER="$CURRENT_USER"
    echo -e "${BLUE}👤 Running as $CURRENT_USER user${NC}"
    echo -e "${BLUE}📁 App directory: $APP_DIR${NC}"
fi

# Function to run commands with proper user
run_cmd() {
    if [ "$CURRENT_USER" = "root" ] && [ "$DEPLOY_USER" != "root" ]; then
        echo -e "${BLUE}🔄 Running as $DEPLOY_USER: $1${NC}"
        su - $DEPLOY_USER -c "cd $APP_DIR && $1"
    else
        echo -e "${BLUE}🔄 Running: $1${NC}"
        cd $APP_DIR && eval $1
    fi
}

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory not found: $APP_DIR${NC}"
    echo "Creating directory and cloning repository..."
    mkdir -p $APP_DIR
    if [ "$CURRENT_USER" = "root" ]; then
        chown $DEPLOY_USER:$DEPLOY_USER $APP_DIR
        su - $DEPLOY_USER -c "cd $APP_DIR && git clone https://github.com/rtsant123/teer-betting-app.git ."
    else
        cd $APP_DIR && git clone https://github.com/rtsant123/teer-betting-app.git .
    fi
fi

# Navigate to app directory
cd $APP_DIR

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found in $APP_DIR${NC}"
    echo "This doesn't look like the teer-betting-app directory."
    exit 1
fi

echo -e "${YELLOW}🔄 Step 1: Stopping current services...${NC}"
run_cmd "docker-compose down"

echo -e "${YELLOW}📥 Step 2: Pulling latest code from GitHub...${NC}"
run_cmd "git pull origin main"

echo -e "${YELLOW}📦 Step 3: Installing timezone dependency...${NC}"
run_cmd "docker-compose run --rm backend pip install pytz" || {
    echo -e "${YELLOW}⚠️ Pip install failed, rebuilding backend container...${NC}"
    run_cmd "docker-compose build backend"
}

echo -e "${YELLOW}🗄️ Step 4: Running database migration...${NC}"
run_cmd "docker-compose up -d db redis"
sleep 10
run_cmd "docker-compose run --rm backend alembic upgrade head"

echo -e "${YELLOW}🔧 Step 5: Creating and running data fix script...${NC}"
cat > fix_timezone_data.py << 'EOF'
#!/usr/bin/env python3
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
        houses = db.query(House).all()
        for house in houses:
            print(f"Updating house: {house.name}")
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

run_cmd "docker-compose run --rm backend python fix_timezone_data.py"

echo -e "${YELLOW}🔄 Step 6: Rebuilding and starting all services...${NC}"
run_cmd "docker-compose build backend"
run_cmd "docker-compose up -d"

echo -e "${YELLOW}⏳ Step 7: Waiting for services to start...${NC}"
sleep 30

echo -e "${YELLOW}📋 Step 8: Checking service status...${NC}"
run_cmd "docker-compose ps"

echo -e "${YELLOW}🔍 Step 9: Testing backend...${NC}"
run_cmd "docker-compose exec -T backend python -c \"
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
\""

# Fix ownership if running as root
if [ "$CURRENT_USER" = "root" ] && [ "$DEPLOY_USER" != "root" ]; then
    echo -e "${YELLOW}🔧 Fixing file ownership...${NC}"
    chown -R $DEPLOY_USER:$DEPLOY_USER $APP_DIR
fi

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
echo "Frontend: http://165.22.61.56:3000"
echo "Admin: http://165.22.61.56:3000/admin"
echo "Backend API: http://165.22.61.56:8000"
echo ""
echo -e "${YELLOW}🔧 To test the fix:${NC}"
echo "1. Go to Admin → Houses"
echo "2. Edit a house and change FR/SR times"
echo "3. Verify that times are saved correctly"
echo "4. Check that future rounds show proper deadline times"

# Cleanup
rm -f fix_timezone_data.py
