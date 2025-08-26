#!/bin/bash

# VPS Quick Setup Script for Teer Betting App
# Optimized for 2GB RAM VPS

set -e

echo "🚀 Starting VPS deployment for Teer Betting App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please run this script as a regular user, not as root"
    exit 1
fi

# Check available RAM
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
if [ "$TOTAL_RAM" -lt 1800 ]; then
    print_warning "Your VPS has ${TOTAL_RAM}MB RAM. Minimum recommended is 2GB (2048MB)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Available RAM: ${TOTAL_RAM}MB"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl git htop ufw

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed"
fi

# Setup basic firewall
print_status "Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8000/tcp  # Backend API
sudo ufw --force enable

# Clone repository
print_status "Cloning repository..."
if [ -d "teer-betting-app" ]; then
    print_warning "Directory teer-betting-app already exists. Updating..."
    cd teer-betting-app
    git pull origin main
else
    git clone https://github.com/rtsant123/teer-betting-app.git
    cd teer-betting-app
fi

# Create environment file
print_status "Creating environment configuration..."
if [ ! -f ".env.vps" ]; then
    cp .env.vps.example .env.vps
    
    # Get VPS IP address
    VPS_IP=$(curl -s https://ipv4.icanhazip.com)
    
    # Generate secure secret key
    SECRET_KEY=$(openssl rand -base64 32)
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Update environment file
    sed -i "s/YOUR_VPS_IP/${VPS_IP}/g" .env.vps
    sed -i "s/change_this_to_a_very_secure_random_string_at_least_32_characters/${SECRET_KEY}/g" .env.vps
    sed -i "s/change_this_secure_password/${DB_PASSWORD}/g" .env.vps
    
    print_status "Environment file created with:"
    print_status "- VPS IP: ${VPS_IP}"
    print_status "- Secure passwords generated"
    print_status "- Secret key generated"
else
    print_warning "Environment file .env.vps already exists"
fi

# Create swap file (recommended for 2GB RAM)
if [ ! -f "/swapfile" ]; then
    print_status "Creating 1GB swap file..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    print_status "Swap file already exists"
fi

# Deploy application
print_status "Building and starting application..."
docker-compose -f docker-compose.vps.yml --env-file .env.vps up -d --build

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Initialize database
print_status "Initializing database..."
docker-compose -f docker-compose.vps.yml exec -T backend python init_db.py || print_warning "Database initialization may have failed"

# Show status
print_status "Checking service status..."
docker-compose -f docker-compose.vps.yml ps

# Show URLs
VPS_IP=$(curl -s https://ipv4.icanhazip.com)
echo
print_status "🎉 Deployment complete!"
echo
echo -e "${GREEN}Your application is now running at:${NC}"
echo -e "Frontend:    ${YELLOW}http://${VPS_IP}:3000${NC}"
echo -e "Backend API: ${YELLOW}http://${VPS_IP}:8000${NC}"
echo -e "API Docs:    ${YELLOW}http://${VPS_IP}:8000/docs${NC}"
echo -e "pgAdmin:     ${YELLOW}http://${VPS_IP}:5050${NC} (optional)"
echo
echo -e "${GREEN}Useful commands:${NC}"
echo "- View logs: docker-compose -f docker-compose.vps.yml logs -f"
echo "- Stop app:  docker-compose -f docker-compose.vps.yml down"
echo "- Start app: docker-compose -f docker-compose.vps.yml up -d"
echo "- Monitor:   docker stats"
echo
print_warning "Remember to:"
print_warning "1. Change default passwords in .env.vps"
print_warning "2. Set up SSL certificate if using a domain"
print_warning "3. Regular backups of your database"

# Check if user needs to logout/login for docker group
if ! groups $USER | grep -q docker; then
    print_warning "You may need to logout and login again for Docker permissions to take effect"
fi
