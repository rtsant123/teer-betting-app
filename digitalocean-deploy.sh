#!/bin/bash

# DigitalOcean Droplet Setup Script for Teer Betting App
# Optimized for DigitalOcean's Ubuntu 22.04 droplets

set -e

echo "🌊 DigitalOcean Deployment Script for Teer Betting App"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Get system information
print_header "System Information"
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
DROPLET_IP=$(curl -s https://ipv4.icanhazip.com)
HOSTNAME=$(hostname)

echo "Hostname: $HOSTNAME"
echo "Public IP: $DROPLET_IP"
echo "Available RAM: ${TOTAL_RAM}MB"
echo

# Check if we're on DigitalOcean
if curl -s --max-time 5 http://169.254.169.254/metadata/v1/id > /dev/null 2>&1; then
    DROPLET_ID=$(curl -s http://169.254.169.254/metadata/v1/id)
    REGION=$(curl -s http://169.254.169.254/metadata/v1/region)
    print_status "DigitalOcean Droplet detected (ID: $DROPLET_ID, Region: $REGION)"
else
    print_warning "Not running on DigitalOcean or metadata service unavailable"
fi

# Check RAM requirements
if [ "$TOTAL_RAM" -lt 1800 ]; then
    print_warning "Your droplet has ${TOTAL_RAM}MB RAM. Recommended minimum is 2GB"
    print_warning "Consider upgrading to a larger droplet for better performance"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
print_header "Updating System Packages"
apt update && apt upgrade -y

# Install essential packages
print_header "Installing Essential Packages"
apt install -y curl git htop ufw unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
print_header "Installing Docker"
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add current user to docker group
    if [ "$USER" != "root" ]; then
        usermod -aG docker $USER
    fi
    
    print_status "Docker installed successfully"
else
    print_status "Docker already installed"
fi

# Install Docker Compose
print_header "Installing Docker Compose"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
else
    print_status "Docker Compose already installed"
fi

# Configure firewall
print_header "Configuring Firewall (UFW)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 3000/tcp # Frontend
ufw allow 8000/tcp # Backend API
ufw allow 5050/tcp # pgAdmin (optional)
ufw --force enable

print_status "Firewall configured with required ports"

# Create swap file for better performance
print_header "Setting Up Swap File"
if [ ! -f "/swapfile" ]; then
    if [ "$TOTAL_RAM" -lt 2048 ]; then
        SWAP_SIZE="2G"
    else
        SWAP_SIZE="1G"
    fi
    
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    print_status "Swap file ($SWAP_SIZE) created and activated"
else
    print_status "Swap file already exists"
fi

# Clone repository
print_header "Cloning Application Repository"
if [ -d "teer-betting-app" ]; then
    print_warning "Directory teer-betting-app already exists. Updating..."
    cd teer-betting-app
    git pull origin main
else
    git clone https://github.com/rtsant123/teer-betting-app.git
    cd teer-betting-app
fi

# Create environment configuration
print_header "Creating Environment Configuration"
if [ ! -f ".env.vps" ]; then
    cp .env.vps.example .env.vps
    
    # Generate secure credentials
    SECRET_KEY=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 16)
    PGADMIN_PASSWORD=$(openssl rand -base64 12)
    
    # Update environment file with DigitalOcean specific settings
    sed -i "s/YOUR_VPS_IP/${DROPLET_IP}/g" .env.vps
    sed -i "s/change_this_to_a_very_secure_random_string_at_least_32_characters/${SECRET_KEY}/g" .env.vps
    sed -i "s/change_this_secure_password/${DB_PASSWORD}/g" .env.vps
    sed -i "s/admin123/${PGADMIN_PASSWORD}/g" .env.vps
    
    print_status "Environment configuration created with:"
    print_status "- Droplet IP: ${DROPLET_IP}"
    print_status "- Secure secret key generated"
    print_status "- Database password: ${DB_PASSWORD}"
    print_status "- pgAdmin password: ${PGADMIN_PASSWORD}"
else
    print_status "Environment file .env.vps already exists"
fi

# Build and deploy application
print_header "Building and Deploying Application"
print_status "This may take 5-10 minutes depending on your droplet size..."

# Pull required images first to show progress
docker-compose -f docker-compose.vps.yml pull

# Build and start services
docker-compose -f docker-compose.vps.yml --env-file .env.vps up -d --build

# Wait for services to initialize
print_header "Waiting for Services to Initialize"
print_status "Waiting 60 seconds for all services to start..."
sleep 60

# Initialize database
print_header "Initializing Database"
if docker-compose -f docker-compose.vps.yml exec -T backend python init_db.py; then
    print_status "Database initialized successfully"
else
    print_warning "Database initialization may have failed - check logs"
fi

# Verify deployment
print_header "Verifying Deployment"
echo "Service Status:"
docker-compose -f docker-compose.vps.yml ps

# Test endpoints
print_status "Testing application endpoints..."
sleep 10

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "✅ Backend API is responding"
else
    print_warning "❌ Backend API is not responding"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is responding"
else
    print_warning "❌ Frontend is not responding"
fi

# Show final information
print_header "🎉 Deployment Complete!"
echo
echo -e "${GREEN}Your Teer Betting App is now running on DigitalOcean!${NC}"
echo
echo -e "${BLUE}Application URLs:${NC}"
echo -e "Frontend:     ${YELLOW}http://${DROPLET_IP}:3000${NC}"
echo -e "Backend API:  ${YELLOW}http://${DROPLET_IP}:8000${NC}"
echo -e "API Docs:     ${YELLOW}http://${DROPLET_IP}:8000/docs${NC}"
echo -e "pgAdmin:      ${YELLOW}http://${DROPLET_IP}:5050${NC}"
echo
echo -e "${BLUE}Credentials:${NC}"
echo -e "Database Password: ${YELLOW}${DB_PASSWORD}${NC}"
echo -e "pgAdmin Password:  ${YELLOW}${PGADMIN_PASSWORD}${NC}"
echo
echo -e "${BLUE}Useful Commands:${NC}"
echo "View logs:    docker-compose -f docker-compose.vps.yml logs -f"
echo "Stop app:     docker-compose -f docker-compose.vps.yml down"
echo "Start app:    docker-compose -f docker-compose.vps.yml up -d"
echo "Monitor:      docker stats"
echo "System info:  htop"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test your application at the URLs above"
echo "2. Set up a domain name (optional)"
echo "3. Configure SSL certificate with Let's Encrypt"
echo "4. Set up automated backups"
echo "5. Monitor your application logs and performance"
echo
print_warning "Save the passwords above in a secure location!"

# Show resource usage
echo -e "${BLUE}Current Resource Usage:${NC}"
free -h
echo
df -h /
echo

print_status "Deployment script completed successfully!"
print_status "Your DigitalOcean droplet is ready for production use."
