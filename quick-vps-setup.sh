#!/bin/bash

# 🚀 Quick VPS Deployment Script for Teer Betting App
# Run this on your VPS: curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/quick-vps-setup.sh | bash

set -e

echo "🎯 Teer Betting App - VPS Quick Setup"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    error "Please run as regular user, not root"
    exit 1
fi

# Get VPS info
VPS_IP=$(curl -s https://ipv4.icanhazip.com)
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')

log "VPS IP: $VPS_IP"
log "Available RAM: ${TOTAL_RAM}MB"

if [ "$TOTAL_RAM" -lt 1800 ]; then
    warn "Low RAM detected. Minimum 2GB recommended."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Update system
log "Updating system..."
sudo apt update -y

# Install Docker
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
else
    log "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose already installed"
fi

# Configure firewall
log "Configuring firewall..."
sudo ufw --force reset >/dev/null 2>&1
sudo ufw default deny incoming >/dev/null 2>&1
sudo ufw default allow outgoing >/dev/null 2>&1
sudo ufw allow ssh >/dev/null 2>&1
sudo ufw allow 80/tcp >/dev/null 2>&1
sudo ufw allow 443/tcp >/dev/null 2>&1
sudo ufw allow 3000/tcp >/dev/null 2>&1
sudo ufw allow 8000/tcp >/dev/null 2>&1
sudo ufw --force enable >/dev/null 2>&1

# Clone repository
log "Cloning repository..."
if [ -d "teer-betting-app" ]; then
    warn "Directory exists. Updating..."
    cd teer-betting-app
    git pull origin main
else
    git clone https://github.com/rtsant123/teer-betting-app.git
    cd teer-betting-app
fi

# Setup environment
log "Setting up environment..."
if [ ! -f ".env.production.local" ]; then
    cp .env.production .env.production.local
    
    # Generate secure values
    SECRET_KEY=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Update environment file
    sed -i "s/CHANGE_THIS_TO_SECURE_SECRET_KEY_MIN_32_CHARACTERS_RANDOM/$SECRET_KEY/g" .env.production.local
    sed -i "s/CHANGE_DB_PASSWORD_SECURE_32_CHARS/$DB_PASSWORD/g" .env.production.local
    sed -i "s/localhost:5432/db:5432/g" .env.production.local
    sed -i "s|http://localhost:3000|http://$VPS_IP:3000|g" .env.production.local
    sed -i "s|http://localhost:8000/api/v1|http://$VPS_IP:8000/api/v1|g" .env.production.local
    
    log "Environment configured with:"
    log "- VPS IP: $VPS_IP"
    log "- Secure credentials generated"
else
    log "Environment file exists, skipping setup"
fi

# Deploy application
log "Building and starting application..."
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build

log "Waiting for services to start..."
sleep 30

# Initialize database
log "Initializing database..."
if docker-compose -f docker-compose.prod.yml --env-file .env.production.local exec -T backend python init_db.py; then
    log "Database initialized successfully"
else
    warn "Database initialization may have failed - check logs"
fi

# Show status
log "Checking application status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "✅ Frontend: http://$VPS_IP:3000"
echo "✅ Backend API: http://$VPS_IP:8000"
echo "✅ API Docs: http://$VPS_IP:8000/docs"
echo ""
echo "🔑 Demo Credentials:"
echo "   Admin: admin / admin123"
echo "   User: testuser1 / test123"
echo ""
echo "📋 Management Commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "🔧 Files created:"
echo "   - .env.production.local (your environment)"
echo "   - Application running in Docker containers"
echo ""

# Test endpoints
log "Testing endpoints..."
sleep 5

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding - check logs"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding - check logs"
fi

echo ""
echo "🚀 Your Teer Betting App is now live!"
echo "📖 For more info, see: VPS_DEPLOYMENT_FROM_GITHUB.md"
