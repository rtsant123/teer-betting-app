#!/bin/bash

# Quick VPS Update via Git
# This script will commit all changes and pull them on VPS

set -e

echo "🚀 Quick VPS Update via Git..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS_USER=${VPS_USER:-"deploy"}
VPS_HOST=${VPS_HOST:-""}
VPS_PATH=${VPS_PATH:-"/home/deploy/teer-betting-app"}

if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}❌ Error: Set VPS_HOST first${NC}"
    echo "Example: VPS_HOST=165.22.61.56 ./quick-vps-update.sh"
    exit 1
fi

echo -e "${YELLOW}📝 Step 1: Committing all changes locally...${NC}"
git add .
git commit -m "Fix: Permanent timezone and deadline time solutions

- Added proper timezone handling for Asia/Kolkata
- Fixed deadline time calculation
- Added daily recurring times for houses
- Improved round scheduling with correct times
- Added database timezone standardization
- Fixed frontend-backend time synchronization"

echo -e "${YELLOW}📤 Step 2: Pushing to GitHub...${NC}"
git push origin main

echo -e "${YELLOW}🔄 Step 3: Updating VPS from GitHub...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && git pull origin main"

echo -e "${YELLOW}🛠️ Step 4: Installing new Python dependencies...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && docker-compose run --rm backend pip install pytz"

echo -e "${YELLOW}🗄️ Step 5: Running database migration...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && docker-compose run --rm backend alembic upgrade head"

echo -e "${YELLOW}🕒 Step 6: Applying timezone fixes to existing data...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && docker-compose run --rm backend python fix_timezone_permanently.py"

echo -e "${YELLOW}🔄 Step 7: Rebuilding and restarting services...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && docker-compose build backend && docker-compose up -d"

echo -e "${YELLOW}⏳ Step 8: Waiting for services...${NC}"
sleep 20

echo -e "${YELLOW}📋 Step 9: Checking status...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && docker-compose ps"

echo -e "${GREEN}✅ VPS Updated Successfully!${NC}"
echo ""
echo "🌐 Frontend: http://$VPS_HOST:3000"
echo "🔧 Admin: http://$VPS_HOST:3000/admin"
echo "📡 API: http://$VPS_HOST:8000"
