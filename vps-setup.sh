#!/bin/bash

# ====================================================================
# VPS SETUP SCRIPT FOR TEER BETTING APP
# Target: Ubuntu 20.04/22.04 LTS (1GB RAM)
# IP: 178.128.61.118
# ====================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BLUE}🔧 VPS SETUP FOR TEER BETTING APP${NC}"
echo -e "${BLUE}=================================${NC}"

# Step 1: System Update
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

# Step 2: Install Essential Packages
print_info "Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

print_status "Essential packages installed"

# Step 3: Create Deploy User
print_info "Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    sudo useradd -m -s /bin/bash deploy
    sudo usermod -aG sudo deploy
    print_status "Deploy user created"
else
    print_warning "Deploy user already exists"
fi

# Set up SSH keys for deploy user (if needed)
sudo mkdir -p /home/deploy/.ssh
sudo chown deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Step 4: Install Docker
print_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker deploy
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed"
else
    print_warning "Docker already installed"
fi

# Step 5: Install Docker Compose
print_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed"
else
    print_warning "Docker Compose already installed"
fi

# Step 6: Configure Firewall
print_info "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # Backend API
sudo ufw --force enable
print_status "Firewall configured"

# Step 7: Optimize System for 1GB RAM
print_info "Optimizing system for 1GB RAM..."

# Configure swap (important for 1GB RAM)
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "1GB swap file created"
fi

# Optimize memory settings
cat << EOF | sudo tee -a /etc/sysctl.conf
# Memory optimization for 1GB RAM
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_background_ratio=5
vm.dirty_ratio=10
EOF

sudo sysctl -p

print_status "Memory optimization applied"

# Step 8: Set up Application Directory
print_info "Setting up application directory..."
sudo mkdir -p /home/deploy/teer-betting-app
sudo chown -R deploy:deploy /home/deploy/teer-betting-app
print_status "Application directory created"

# Step 9: Clone Application
print_info "Cloning application..."
sudo -u deploy git clone https://github.com/rtsant123/teer-betting-app.git /home/deploy/teer-betting-app
print_status "Application cloned"

# Step 10: Set up Log Rotation
print_info "Setting up log rotation..."
cat << EOF | sudo tee /etc/logrotate.d/teer-betting-app
/home/deploy/teer-betting-app/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    su deploy deploy
}
EOF

print_status "Log rotation configured"

# Step 11: Install Monitoring Tools
print_info "Installing monitoring tools..."
sudo apt install -y htop iotop nethogs

print_status "Monitoring tools installed"

# Step 12: Create Backup Directory
print_info "Setting up backup directory..."
sudo mkdir -p /home/deploy/backups
sudo chown -R deploy:deploy /home/deploy/backups
print_status "Backup directory created"

# Step 13: Set up Cron for Automatic Updates
print_info "Setting up maintenance cron jobs..."
(sudo -u deploy crontab -l 2>/dev/null; echo "0 2 * * * cd /home/deploy/teer-betting-app && docker-compose -f docker-compose.prod-optimized.yml exec -T db pg_dump -U teer_admin teer_betting_prod > /home/deploy/backups/db_backup_\$(date +%Y%m%d).sql") | sudo -u deploy crontab -

print_status "Cron jobs configured"

# Final Summary
echo ""
echo -e "${GREEN}🎉 VPS SETUP COMPLETE!${NC}"
echo -e "${GREEN}======================${NC}"
echo ""
echo -e "${YELLOW}📋 Setup Summary:${NC}"
echo "• System updated and optimized for 1GB RAM"
echo "• Docker and Docker Compose installed"
echo "• Deploy user created with sudo access"
echo "• Firewall configured (ports 22, 80, 443, 8000)"
echo "• 1GB swap file created"
echo "• Application cloned to /home/deploy/teer-betting-app"
echo "• Log rotation and backups configured"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Switch to deploy user: sudo su - deploy"
echo "2. Navigate to app: cd /home/deploy/teer-betting-app"
echo "3. Run deployment: ./deploy-production-vps.sh"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "• Please log out and log back in for Docker permissions"
echo "• Ensure your SSH key is added to the deploy user if needed"
echo "• Monitor memory usage after deployment"
echo ""
echo -e "${GREEN}✅ VPS is ready for deployment!${NC}"
