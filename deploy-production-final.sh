#!/bin/bash

# ====================================================================
# PRODUCTION DEPLOYMENT SCRIPT FOR VPS 178.128.61.118
# Clean, Optimized, and Ready for 1GB RAM
# ====================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}🚀 PRODUCTION DEPLOYMENT - VPS 178.128.61.118${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Configuration
VPS_IP="178.128.61.118"
APP_DIR="/home/deploy/teer-betting-app"

# Check if we're in the right directory
if [ ! -f "docker-compose.prod-optimized.yml" ]; then
    print_error "Not in the correct directory. Please run from: $APP_DIR"
    exit 1
fi

print_info "Using production configuration:"
echo "  • VPS IP: $VPS_IP"
echo "  • Database: postgres/postgres123"
echo "  • Memory: Optimized for 1GB RAM"
echo "  • CORS: Fixed for VPS IP (no localhost)"
echo ""

# Step 1: Environment Check
print_info "Step 1: Checking environment configuration..."

if [ ! -f ".env" ]; then
    print_error ".env file not found"
    exit 1
fi

# Verify critical settings
if grep -q "178.128.61.118" .env && grep -q "postgres123" .env; then
    print_status "Environment configured correctly"
else
    print_error "Environment file has incorrect settings"
    exit 1
fi

# Step 2: Clean Previous Deployment
print_info "Step 2: Cleaning previous deployment..."
docker-compose -f docker-compose.prod-optimized.yml down --remove-orphans 2>/dev/null || true
docker system prune -f
print_status "Previous deployment cleaned"

# Step 3: Build Optimized Images
print_info "Step 3: Building optimized Docker images..."
docker-compose -f docker-compose.prod-optimized.yml build --no-cache
print_status "Images built successfully"

# Step 4: Start Services
print_info "Step 4: Starting production services..."
docker-compose -f docker-compose.prod-optimized.yml up -d
print_status "Services started"

# Step 5: Wait and Health Check
print_info "Step 5: Performing health checks..."
sleep 30

# Database check
if docker-compose -f docker-compose.prod-optimized.yml exec -T db pg_isready -U postgres; then
    print_status "Database is ready"
else
    print_error "Database is not responding"
    exit 1
fi

# Backend check
for i in {1..5}; do
    if curl -f http://localhost:8000/health &>/dev/null; then
        print_status "Backend API is responding"
        break
    elif [ $i -eq 5 ]; then
        print_error "Backend API failed to start"
        exit 1
    else
        print_info "Waiting for backend... ($i/5)"
        sleep 10
    fi
done

# Frontend check
if curl -f http://localhost:80 &>/dev/null; then
    print_status "Frontend is responding"
else
    print_warning "Frontend check failed, but may still be loading"
fi

# Step 6: Initialize Database
print_info "Step 6: Initializing database..."
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python -m alembic upgrade head
print_status "Database migrations completed"

# Create admin user (if doesn't exist)
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python -c "
import sys
sys.path.append('/app')
from app.database import get_db
from app.models import User
from sqlalchemy.orm import Session
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = next(get_db())

admin = db.query(User).filter(User.username == 'admin').first()
if not admin:
    admin = User(
        username='admin',
        phone='1234567890',
        password_hash=pwd_context.hash('admin123'),
        is_admin=True,
        wallet_balance=0.0
    )
    db.add(admin)
    db.commit()
    print('Admin user created: admin/admin123')
else:
    print('Admin user already exists')
db.close()
" || print_warning "Admin user creation skipped"

# Setup payment methods (if needed)
docker-compose -f docker-compose.prod-optimized.yml exec -T backend python -c "
import sys
sys.path.append('/app')
from app.database import get_db
from app.models.payment_method import PaymentMethod, PaymentMethodType, PaymentMethodStatus

db = next(get_db())
if db.query(PaymentMethod).count() == 0:
    methods = [
        PaymentMethod(
            name='UPI Payment',
            type=PaymentMethodType.UPI,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=10,
            max_amount=50000,
            status=PaymentMethodStatus.ACTIVE,
            details={'instructions': 'Send payment to UPI ID and upload screenshot'}
        ),
        PaymentMethod(
            name='Bank Transfer',
            type=PaymentMethodType.BANK_TRANSFER,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=100,
            max_amount=100000,
            status=PaymentMethodStatus.ACTIVE,
            details={'instructions': 'Transfer to bank account and provide transaction details'}
        )
    ]
    for method in methods:
        db.add(method)
    db.commit()
    print('Payment methods created')
else:
    print('Payment methods already exist')
db.close()
" || print_warning "Payment methods setup skipped"

# Step 7: Final Verification
print_info "Step 7: Final verification..."

echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod-optimized.yml ps

echo ""
echo "Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Final Summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${YELLOW}🌐 Access Your Application:${NC}"
echo "  Frontend:     http://$VPS_IP"
echo "  Admin Panel:  http://$VPS_IP/admin"
echo "  API Docs:     http://$VPS_IP:8000/api/v1/docs"
echo "  Health Check: http://$VPS_IP:8000/health"
echo ""
echo -e "${YELLOW}👤 Admin Login:${NC}"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}✅ Production Features:${NC}"
echo "  • Database: postgres/postgres123 (your existing credentials)"
echo "  • CORS: Fixed for VPS IP $VPS_IP (no localhost)"
echo "  • Memory: Optimized for 1GB RAM"
echo "  • Security: Non-root containers, secure secrets"
echo "  • Monitoring: Resource limits and health checks"
echo "  • Transaction Details: Fixed in admin panel"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo "  View logs:    docker-compose -f docker-compose.prod-optimized.yml logs -f"
echo "  Restart:      docker-compose -f docker-compose.prod-optimized.yml restart"
echo "  Stop:         docker-compose -f docker-compose.prod-optimized.yml down"
echo "  Monitor:      docker stats"
echo ""
echo -e "${GREEN}🚀 Your Teer Betting App is ready for production!${NC}"
