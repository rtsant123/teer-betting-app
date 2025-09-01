#!/bin/bash

# Deploy Timezone Fix to VPS
# This script will deploy all the permanent timezone and deadline fixes to your VPS

set -e

echo "🚀 Starting VPS Deployment of Timezone Fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_USER=${VPS_USER:-"deploy"}
VPS_HOST=${VPS_HOST:-""}
VPS_PATH=${VPS_PATH:-"/home/deploy/teer-betting-app"}

# Check if VPS_HOST is set
if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}❌ Error: VPS_HOST environment variable is not set${NC}"
    echo "Please set your VPS IP address:"
    echo "export VPS_HOST=your.vps.ip.address"
    echo "Or run: VPS_HOST=your.vps.ip.address ./deploy-timezone-fix.sh"
    exit 1
fi

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "VPS User: $VPS_USER"
echo "VPS Host: $VPS_HOST"
echo "VPS Path: $VPS_PATH"
echo ""

# Function to run commands on VPS
run_on_vps() {
    ssh $VPS_USER@$VPS_HOST "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    scp -r "$1" $VPS_USER@$VPS_HOST:"$2"
}

echo -e "${YELLOW}🔄 Step 1: Backing up current VPS application...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose down"
run_on_vps "cd $VPS_PATH && cp -r . ../teer-betting-app-backup-$(date +%Y%m%d-%H%M%S) || true"

echo -e "${YELLOW}📤 Step 2: Copying updated files to VPS...${NC}"

# Copy all the updated backend files
copy_to_vps "backend/app/" "$VPS_PATH/backend/"
copy_to_vps "backend/requirements.txt" "$VPS_PATH/backend/"

# Copy migration files
copy_to_vps "backend/alembic/" "$VPS_PATH/backend/"

# Copy scripts
copy_to_vps "fix_timezone_permanently.py" "$VPS_PATH/"

# Copy docker files
copy_to_vps "docker-compose.yml" "$VPS_PATH/"

echo -e "${YELLOW}🐳 Step 3: Rebuilding Docker containers with timezone fixes...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose build --no-cache backend"

echo -e "${YELLOW}🗄️ Step 4: Running database migration...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose up -d db redis"
sleep 10
run_on_vps "cd $VPS_PATH && docker-compose run --rm backend alembic upgrade head"

echo -e "${YELLOW}🕒 Step 5: Applying timezone fixes to existing data...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose run --rm backend python fix_timezone_permanently.py"

echo -e "${YELLOW}🚀 Step 6: Starting all services...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose up -d"

echo -e "${YELLOW}⏳ Step 7: Waiting for services to start...${NC}"
sleep 30

echo -e "${YELLOW}🔍 Step 8: Checking service status...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose ps"

echo -e "${YELLOW}📋 Step 9: Checking backend logs...${NC}"
run_on_vps "cd $VPS_PATH && docker-compose logs --tail=20 backend"

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${GREEN}🎉 Timezone fixes have been permanently applied to your VPS!${NC}"
echo ""
echo -e "${YELLOW}📝 What was fixed:${NC}"
echo "• ✅ Proper timezone handling (Asia/Kolkata)"
echo "• ✅ Consistent deadline time calculation"
echo "• ✅ Daily recurring times for houses"
echo "• ✅ Automatic round scheduling with correct times"
echo "• ✅ Database timezone storage standardization"
echo ""
echo -e "${YELLOW}🌐 Access your application:${NC}"
echo "Frontend: http://$VPS_HOST:3000"
echo "Admin: http://$VPS_HOST:3000/admin"
echo "Backend API: http://$VPS_HOST:8000"
echo ""
echo -e "${YELLOW}🔧 To verify the fix:${NC}"
echo "1. Go to Admin → Houses"
echo "2. Edit a house and change the FR/SR times"
echo "3. Check that future rounds are scheduled with correct times"
echo "4. Verify that deadline times are calculated correctly"
