#!/bin/bash

# =================================================================
# TEER BETTING APP - PRODUCTION DEPLOYMENT SCRIPT
# =================================================================
# Version: 2.0
# Description: Complete production deployment script for VPS
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/rtsant123/teer-betting-app.git"
APP_DIR="/opt/teer-betting-app"
LOG_FILE="/var/log/teer-deploy.log"

# Function to print colored output
print_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}\n"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Create log file
sudo mkdir -p /var/log
sudo touch $LOG_FILE
sudo chmod 666 $LOG_FILE

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

print_header "🚀 TEER BETTING APP DEPLOYMENT v2.0"

# Pre-flight checks
print_info "Running pre-flight checks..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please run this script as a regular user with sudo privileges, not as root"
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

# Check available disk space
AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 5242880 ]; then # 5GB in KB
    print_warning "Less than 5GB available disk space. Recommended: 10GB+"
fi

print_status "System checks passed - RAM: ${TOTAL_RAM}MB, Available space: $((AVAILABLE_SPACE/1024/1024))GB"
log "Pre-flight checks completed - RAM: ${TOTAL_RAM}MB"

# Get VPS IP
VPS_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "UNKNOWN")
print_info "Detected VPS IP: $VPS_IP"

# Collect user configuration
print_header "📝 CONFIGURATION SETUP"

# Domain configuration
read -p "Enter your domain name (or press Enter to use IP only): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$VPS_IP
    USE_IP_ONLY=true
    print_info "Using IP-only configuration: $VPS_IP"
else
    USE_IP_ONLY=false
    print_info "Using domain configuration: $DOMAIN"
fi

# Generate strong passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
SECRET_KEY=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

print_status "Generated secure passwords for all services"

# Update system
print_header "📦 SYSTEM UPDATE"
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
log "System packages updated"

# Install essential packages
print_info "Installing essential packages..."
sudo apt install -y curl wget git ufw htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
log "Essential packages installed"

# Install Docker
print_header "🐳 DOCKER INSTALLATION"
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    print_status "Docker installed successfully"
    log "Docker installed"
else
    print_status "Docker is already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
    log "Docker Compose installed"
else
    print_status "Docker Compose is already installed"
fi

# Configure Firewall
print_header "🔥 FIREWALL CONFIGURATION"
print_info "Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8001/tcp  # Backend API
if [ "$USE_IP_ONLY" = true ]; then
    sudo ufw allow 5050/tcp  # pgAdmin for IP-only setup
fi
sudo ufw --force enable
print_status "Firewall configured and enabled"
log "Firewall configured"

# Clone repository
print_header "📁 APPLICATION SETUP"
if [ -d "$APP_DIR" ]; then
    print_warning "Application directory exists. Backing up..."
    sudo mv $APP_DIR $APP_DIR.backup.$(date +%s)
fi

print_info "Cloning repository..."
sudo git clone $REPO_URL $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR
print_status "Repository cloned to $APP_DIR"
log "Repository cloned"

# Create production environment file
print_header "⚙️  ENVIRONMENT CONFIGURATION"
print_info "Creating production environment file..."

cat > .env.production << EOF
# =================================================================
# TEER BETTING APP - PRODUCTION CONFIGURATION
# =================================================================

# Database Configuration
POSTGRES_DB=teer_betting_prod
POSTGRES_USER=teer_admin
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://teer_admin:$POSTGRES_PASSWORD@db:5432/teer_betting_prod
DB_PORT=5432

# Security Configuration
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application Configuration
APP_NAME=Teer Betting Platform
DEBUG=False
ENVIRONMENT=production
API_V1_STR=/api/v1

# Domain & CORS Configuration
DOMAIN=$DOMAIN
EOF

if [ "$USE_IP_ONLY" = true ]; then
cat >> .env.production << EOF
ALLOWED_ORIGINS=http://$VPS_IP,http://$VPS_IP:80,http://$VPS_IP:8001
BACKEND_CORS_ORIGINS=http://$VPS_IP,http://$VPS_IP:80,http://$VPS_IP:8001
REACT_APP_API_BASE_URL=http://$VPS_IP:8001/api/v1
EOF
else
cat >> .env.production << EOF
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,http://$DOMAIN,http://www.$DOMAIN
BACKEND_CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,http://$DOMAIN,http://www.$DOMAIN
REACT_APP_API_BASE_URL=/api/v1
EOF
fi

cat >> .env.production << EOF

# Frontend & Backend Ports
FRONTEND_PORT=80
BACKEND_PORT=8001

# Redis Configuration
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# OTP Configuration
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6

# pgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@$DOMAIN
PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASSWORD

# Security
FORCE_HTTPS=False
SECURE_SSL_REDIRECT=False

# Deployment Info
VPS_IP=$VPS_IP
DEPLOY_DATE=$(date '+%Y-%m-%d_%H-%M-%S')
EOF

# Copy to .env for docker-compose
cp .env.production .env

print_status "Environment configuration created"
log "Environment configuration created"

# Build and start services
print_header "🏗️  APPLICATION BUILD & DEPLOYMENT"
print_info "Building Docker containers..."
docker-compose -f docker-compose.prod.yml build --no-cache
log "Docker containers built"

print_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d
log "Services started"

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 30

# Check service health
print_header "🔍 HEALTH CHECKS"
print_info "Checking service health..."

# Check if containers are running
FRONTEND_STATUS=$(docker ps --filter "name=teer_frontend_prod" --format "{{.Status}}" | head -1)
BACKEND_STATUS=$(docker ps --filter "name=teer_backend_prod" --format "{{.Status}}" | head -1)
DB_STATUS=$(docker ps --filter "name=teer_db_prod" --format "{{.Status}}" | head -1)

if [[ $FRONTEND_STATUS == *"Up"* ]]; then
    print_status "Frontend container is running"
else
    print_error "Frontend container is not running"
fi

if [[ $BACKEND_STATUS == *"Up"* ]]; then
    print_status "Backend container is running"
else
    print_error "Backend container is not running"
fi

if [[ $DB_STATUS == *"Up"* ]]; then
    print_status "Database container is running"
else
    print_error "Database container is not running"
fi

# Test API endpoint
sleep 10
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    print_status "Backend API is responding"
else
    print_warning "Backend API health check failed (may need more time to start)"
fi

# Initialize database
print_header "💾 DATABASE INITIALIZATION"
print_info "Initializing database..."
docker-compose -f docker-compose.prod.yml exec -T backend python init_db_robust.py
log "Database initialized"

# Create admin user
print_info "Setting up admin user..."
docker-compose -f docker-compose.prod.yml exec -T backend python create_admin_user.py
log "Admin user created"

# Setup log rotation
print_header "📝 LOG MANAGEMENT"
sudo tee /etc/logrotate.d/teer-app > /dev/null << EOF
/var/log/teer-deploy.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
print_status "Log rotation configured"

# Create systemd service for auto-start
print_header "🔄 AUTO-START CONFIGURATION"
sudo tee /etc/systemd/system/teer-app.service > /dev/null << EOF
[Unit]
Description=Teer Betting App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable teer-app.service
print_status "Auto-start service configured"

# Create maintenance scripts
print_header "🛠️  MAINTENANCE SCRIPTS"
cat > ~/teer-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/teer"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd /opt/teer-betting-app
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U teer_admin teer_betting_prod > $BACKUP_DIR/db_backup_$DATE.sql
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz --exclude='node_modules' --exclude='*.log' .
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
EOF

cat > ~/teer-logs.sh << 'EOF'
#!/bin/bash
cd /opt/teer-betting-app
echo "=== Frontend Logs ==="
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
echo -e "\n=== Backend Logs ==="
docker-compose -f docker-compose.prod.yml logs --tail=50 backend
echo -e "\n=== Database Logs ==="
docker-compose -f docker-compose.prod.yml logs --tail=50 db
EOF

cat > ~/teer-status.sh << 'EOF'
#!/bin/bash
cd /opt/teer-betting-app
echo "=== Container Status ==="
docker-compose -f docker-compose.prod.yml ps
echo -e "\n=== Resource Usage ==="
docker stats --no-stream
echo -e "\n=== API Health ==="
curl -s http://localhost:8001/health | head -c 500
echo -e "\n=== Application URLs ==="
VPS_IP=$(curl -s ifconfig.me)
echo "Application: http://$VPS_IP"
echo "Backend API: http://$VPS_IP:8001"
echo "API Docs: http://$VPS_IP:8001/docs"
echo "Database Admin: http://$VPS_IP:5050"
EOF

chmod +x ~/teer-*.sh
print_status "Maintenance scripts created in home directory"

# Final deployment summary
print_header "🎉 DEPLOYMENT COMPLETE!"

echo -e "\n${GREEN}=== DEPLOYMENT SUMMARY ===${NC}"
echo -e "${CYAN}VPS IP:${NC} $VPS_IP"
echo -e "${CYAN}Domain:${NC} $DOMAIN"
echo -e "${CYAN}Application:${NC} http://$VPS_IP"
echo -e "${CYAN}Backend API:${NC} http://$VPS_IP:8001"
echo -e "${CYAN}API Documentation:${NC} http://$VPS_IP:8001/docs"
if [ "$USE_IP_ONLY" = true ]; then
    echo -e "${CYAN}Database Admin:${NC} http://$VPS_IP:5050"
    echo -e "${CYAN}pgAdmin Email:${NC} admin@$DOMAIN"
    echo -e "${CYAN}pgAdmin Password:${NC} $PGADMIN_PASSWORD"
fi

echo -e "\n${GREEN}=== SECURITY CREDENTIALS ===${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials securely!${NC}"
echo -e "${CYAN}Database User:${NC} teer_admin"
echo -e "${CYAN}Database Password:${NC} $POSTGRES_PASSWORD"
echo -e "${CYAN}Secret Key:${NC} $SECRET_KEY"
echo -e "${CYAN}Redis Password:${NC} $REDIS_PASSWORD"

echo -e "\n${GREEN}=== MAINTENANCE COMMANDS ===${NC}"
echo -e "${CYAN}View logs:${NC} ~/teer-logs.sh"
echo -e "${CYAN}Check status:${NC} ~/teer-status.sh"
echo -e "${CYAN}Create backup:${NC} ~/teer-backup.sh"
echo -e "${CYAN}Restart app:${NC} cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart"
echo -e "${CYAN}Update app:${NC} cd $APP_DIR && git pull && docker-compose -f docker-compose.prod.yml up -d --build"

echo -e "\n${GREEN}=== NEXT STEPS ===${NC}"
if [ "$USE_IP_ONLY" = false ]; then
    echo -e "1. Point your domain DNS to: ${CYAN}$VPS_IP${NC}"
    echo -e "2. Install SSL certificate (Let's Encrypt recommended)"
    echo -e "3. Update FORCE_HTTPS=True in .env.production"
else
    echo -e "1. Test the application at: ${CYAN}http://$VPS_IP${NC}"
    echo -e "2. Configure domain DNS if needed"
fi
echo -e "3. Set up regular backups (cron job for ~/teer-backup.sh)"
echo -e "4. Monitor logs regularly with ~/teer-logs.sh"

echo -e "\n${PURPLE}🚀 Your Teer Betting App is now live!${NC}"
log "Deployment completed successfully"

# Save deployment info
cat > ~/deployment-info.txt << EOF
Teer Betting App Deployment Info
================================
Date: $(date)
VPS IP: $VPS_IP
Domain: $DOMAIN
Application URL: http://$VPS_IP
Backend API: http://$VPS_IP:8001
Database Password: $POSTGRES_PASSWORD
Secret Key: $SECRET_KEY
Redis Password: $REDIS_PASSWORD
pgAdmin Password: $PGADMIN_PASSWORD
EOF

print_status "Deployment information saved to ~/deployment-info.txt"
echo -e "\n${GREEN}Deployment completed successfully! 🎉${NC}"
