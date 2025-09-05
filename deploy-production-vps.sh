#!/bin/bash

# ====================================================================
# TEER BETTING APP - PRODUCTION DEPLOYMENT SCRIPT
# VPS: 178.128.61.118 (1GB RAM Optimized)
# ====================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="178.128.61.118"
APP_NAME="teer-betting-app"
DEPLOY_USER="deploy"
APP_DIR="/home/$DEPLOY_USER/$APP_NAME"

echo -e "${BLUE}🚀 TEER BETTING APP - PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${YELLOW}VPS IP: $VPS_IP${NC}"
echo -e "${YELLOW}Target: 1GB RAM Production Environment${NC}"
echo -e ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: System Requirements Check
echo -e "${BLUE}📋 Step 1: Checking System Requirements...${NC}"

# Check if running as deploy user
if [ "$USER" != "$DEPLOY_USER" ]; then
    print_error "Please run this script as the deploy user"
    echo "Switch to deploy user: sudo su - $DEPLOY_USER"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $DEPLOY_USER
    print_warning "Please log out and log back in for Docker permissions to take effect"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

print_status "System requirements satisfied"

# Step 2: Application Setup
echo -e "${BLUE}📁 Step 2: Setting up Application...${NC}"

# Navigate to app directory
cd $APP_DIR || {
    print_error "Application directory not found: $APP_DIR"
    echo "Please ensure the app is cloned to: $APP_DIR"
    exit 1
}

print_status "Application directory found"

# Step 3: Environment Configuration
echo -e "${BLUE}⚙️  Step 3: Configuring Environment...${NC}"

# Copy production environment file
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        print_status "Production environment file copied"
    else
        print_error "No .env.production file found"
        exit 1
    fi
fi

# Update environment with VPS IP
sed -i "s/VPS_IP=.*/VPS_IP=$VPS_IP/" .env
sed -i "s/DOMAIN=.*/DOMAIN=$VPS_IP/" .env
sed -i "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=http://$VPS_IP:8000/api/v1|" .env

print_status "Environment configured for VPS IP: $VPS_IP"

# Step 4: Memory Optimization Check
echo -e "${BLUE}🧠 Step 4: Memory Optimization Check...${NC}"

# Check available memory
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%d", $7}')
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%d", $2}')

echo "Total RAM: ${TOTAL_MEM}MB"
echo "Available RAM: ${AVAILABLE_MEM}MB"

if [ $TOTAL_MEM -lt 900 ]; then
    print_warning "System has less than 1GB RAM. Using ultra-light configuration..."
    # Use even more conservative memory limits
    sed -i 's/BACKEND_MEMORY_LIMIT=300m/BACKEND_MEMORY_LIMIT=200m/' .env
    sed -i 's/FRONTEND_MEMORY_LIMIT=150m/FRONTEND_MEMORY_LIMIT=100m/' .env
    sed -i 's/DATABASE_MEMORY_LIMIT=400m/DATABASE_MEMORY_LIMIT=300m/' .env
fi

print_status "Memory optimization configured"

# Step 5: Cleanup Previous Deployment
echo -e "${BLUE}🧹 Step 5: Cleaning up previous deployment...${NC}"

# Stop existing containers
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod-optimized.yml down --remove-orphans 2>/dev/null || true

# Clean up docker resources
docker system prune -f

print_status "Previous deployment cleaned"

# Step 6: Build and Deploy
echo -e "${BLUE}🔨 Step 6: Building and deploying application...${NC}"

# Build with optimized compose file
docker-compose -f docker-compose.prod-optimized.yml build --no-cache

print_status "Application built successfully"

# Step 7: Start Services
echo -e "${BLUE}🚀 Step 7: Starting services...${NC}"

# Start services with optimized configuration
docker-compose -f docker-compose.prod-optimized.yml up -d

print_status "Services started"

# Step 8: Health Checks
echo -e "${BLUE}🏥 Step 8: Performing health checks...${NC}"

print_info "Waiting for services to start..."
sleep 30

# Check database
print_info "Checking database..."
if docker-compose -f docker-compose.prod-optimized.yml exec -T db pg_isready -U postgres; then
    print_status "Database is ready"
else
    print_error "Database is not responding"
fi

# Check backend
print_info "Checking backend API..."
for i in {1..5}; do
    if curl -f http://localhost:8000/health &>/dev/null; then
        print_status "Backend API is responding"
        break
    else
        if [ $i -eq 5 ]; then
            print_error "Backend API is not responding after 5 attempts"
        else
            print_info "Attempt $i/5: Backend not ready, waiting..."
            sleep 10
        fi
    fi
done

# Check frontend
print_info "Checking frontend..."
if curl -f http://localhost:80 &>/dev/null; then
    print_status "Frontend is responding"
else
    print_warning "Frontend check failed, but may still be loading"
fi

# Step 9: Database Initialization
echo -e "${BLUE}💾 Step 9: Initializing database...${NC}"

# Run database migrations
print_info "Running database migrations..."
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python -m alembic upgrade head

# Create initial admin user
print_info "Creating admin user..."
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python create_admin_user.py || true

# Setup payment methods
print_info "Setting up payment methods..."
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python setup_payment_methods.py || true

print_status "Database initialized"

# Step 10: Container Resource Monitoring
echo -e "${BLUE}📊 Step 10: Container resource check...${NC}"

echo "Container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

print_status "Resource monitoring complete"

# Step 11: Final Summary
echo -e "${BLUE}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "${GREEN}✅ Application URL: http://$VPS_IP${NC}"
echo -e "${GREEN}✅ Admin Panel: http://$VPS_IP/admin${NC}"
echo -e "${GREEN}✅ API Docs: http://$VPS_IP:8000/api/v1/docs${NC}"
echo -e "${GREEN}✅ API Health: http://$VPS_IP:8000/health${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Test the application in your browser"
echo "2. Login to admin panel and configure settings"
echo "3. Test user registration and betting functions"
echo "4. Monitor resource usage: docker stats"
echo "5. Check logs if needed: docker-compose -f docker-compose.prod-optimized.yml logs"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "• View logs: docker-compose -f docker-compose.prod-optimized.yml logs -f"
echo "• Restart services: docker-compose -f docker-compose.prod-optimized.yml restart"
echo "• Stop services: docker-compose -f docker-compose.prod-optimized.yml down"
echo "• Monitor resources: watch docker stats"
echo ""
echo -e "${GREEN}🚀 Deployment completed successfully!${NC}"
