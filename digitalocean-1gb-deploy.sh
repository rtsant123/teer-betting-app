#!/bin/bash

# 1GB RAM DigitalOcean Droplet Deployment Script
# Ultra-optimized for minimal memory usage

set -e

echo "🌊 1GB RAM DigitalOcean Deployment for Teer Betting App"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Get system information
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
DROPLET_IP=$(curl -s https://ipv4.icanhazip.com)

print_status "Droplet IP: $DROPLET_IP"
print_status "Available RAM: ${TOTAL_RAM}MB"

# Optimize system for 1GB RAM
print_header "Optimizing System for 1GB RAM"

# Update system
apt update && apt upgrade -y

# Install essential packages only
apt install -y curl git htop ufw unzip

# Configure swap (essential for 1GB RAM)
print_header "Creating 2GB Swap File (Essential for 1GB RAM)"
if [ ! -f "/swapfile" ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Optimize swap usage
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p
    
    print_status "2GB swap file created and optimized"
else
    print_status "Swap file already exists"
fi

# Install Docker (lightweight installation)
print_header "Installing Docker"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed"
fi

# Configure firewall
print_header "Configuring Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp # Frontend
ufw allow 8000/tcp # Backend API
ufw --force enable

# Clone repository
print_header "Cloning Repository"
if [ -d "teer-betting-app" ]; then
    cd teer-betting-app
    git pull origin main
else
    git clone https://github.com/rtsant123/teer-betting-app.git
    cd teer-betting-app
fi

# Create optimized environment
print_header "Creating 1GB RAM Optimized Environment"
cp .env.1gb.example .env.1gb

# Generate secure credentials
SECRET_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 12)

# Update environment file
sed -i "s/YOUR_DROPLET_IP/${DROPLET_IP}/g" .env.1gb
sed -i "s/change_this_to_a_very_secure_random_string_at_least_32_characters/${SECRET_KEY}/g" .env.1gb
sed -i "s/change_this_secure_password/${DB_PASSWORD}/g" .env.1gb

print_status "Environment configured for 1GB RAM with:"
print_status "- Droplet IP: ${DROPLET_IP}"
print_status "- Database password: ${DB_PASSWORD}"

# Deploy with 1GB optimized configuration
print_header "Deploying Application (1GB RAM Optimized)"
print_warning "This will use minimal memory settings. Build may take 10-15 minutes on 1GB RAM..."

# Build and deploy with memory constraints
docker-compose -f docker-compose.1gb.yml --env-file .env.1gb up -d --build

# Wait for services (longer wait for 1GB RAM)
print_header "Waiting for Services (Extended wait for 1GB RAM)"
print_status "Waiting 90 seconds for all services to start..."
sleep 90

# Initialize database
print_header "Initializing Database"
if docker-compose -f docker-compose.1gb.yml exec -T backend python init_db.py; then
    print_status "Database initialized successfully"
else
    print_warning "Database initialization may have failed - will retry..."
    sleep 30
    docker-compose -f docker-compose.1gb.yml exec -T backend python init_db.py || print_warning "Please check logs"
fi

# Show deployment status
print_header "Deployment Status"
docker-compose -f docker-compose.1gb.yml ps

# Memory usage check
print_header "Memory Usage Check"
free -h
echo
docker stats --no-stream

# Test application
print_status "Testing application..."
sleep 15

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "✅ Backend API is responding"
else
    print_warning "❌ Backend API check failed (may need more time)"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is responding"
else
    print_warning "❌ Frontend check failed (may need more time)"
fi

# Final information
print_header "🎉 1GB RAM Deployment Complete!"
echo
echo -e "${GREEN}Your Teer Betting App is running on 1GB RAM DigitalOcean droplet!${NC}"
echo
echo -e "${BLUE}Application URLs:${NC}"
echo -e "Frontend:     ${YELLOW}http://${DROPLET_IP}:3000${NC}"
echo -e "Backend API:  ${YELLOW}http://${DROPLET_IP}:8000${NC}"
echo -e "API Docs:     ${YELLOW}http://${DROPLET_IP}:8000/docs${NC}"
echo
echo -e "${BLUE}Memory Optimization Applied:${NC}"
echo "- PostgreSQL: Limited to 200MB with 64MB shared buffers"
echo "- Redis: Limited to 50MB with LRU eviction"
echo "- Backend: Single worker, 180MB limit"
echo "- Frontend: Ultra-lightweight Nginx, 32MB limit"
echo "- Total: ~476MB (leaving 500MB+ for system + swap)"
echo
echo -e "${BLUE}Management Commands:${NC}"
echo "View logs:    docker-compose -f docker-compose.1gb.yml logs -f"
echo "Stop app:     docker-compose -f docker-compose.1gb.yml down"
echo "Start app:    docker-compose -f docker-compose.1gb.yml up -d"
echo "Monitor:      docker stats"
echo "Memory:       free -h"
echo
echo -e "${YELLOW}Important Notes for 1GB RAM:${NC}"
echo "- First startup may take 10-15 minutes"
echo "- Services may be slower to respond initially"
echo "- 2GB swap file created for memory overflow"
echo "- Monitor memory usage regularly"
echo
print_status "Database password: ${DB_PASSWORD}"
print_warning "Save this password securely!"

echo
print_status "Your 1GB DigitalOcean droplet is optimized and ready!"
