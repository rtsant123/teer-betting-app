#!/bin/bash

echo "🚀 Deploying Simplified Wallet Update..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verify we're in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Pulling latest changes from repository..."
git pull origin main

if [ $? -eq 0 ]; then
    print_success "Latest changes pulled successfully"
else
    print_error "Failed to pull latest changes"
    exit 1
fi

print_status "Setting up payment methods for withdrawals..."
# Ensure payment methods are properly configured
docker-compose exec -T backend python setup_payment_methods.py

if [ $? -eq 0 ]; then
    print_success "Payment methods configured successfully"
else
    print_error "Failed to configure payment methods"
fi

print_status "Stopping frontend container..."
docker-compose stop frontend

print_status "Rebuilding frontend with simplified wallet..."
docker-compose build --no-cache frontend

if [ $? -eq 0 ]; then
    print_success "Frontend rebuilt successfully"
else
    print_error "Failed to rebuild frontend"
    exit 1
fi

print_status "Starting frontend container..."
docker-compose up -d frontend

if [ $? -eq 0 ]; then
    print_success "Frontend started successfully"
else
    print_error "Failed to start frontend"
    exit 1
fi

print_status "Waiting for frontend to be ready..."
sleep 10

# Check if frontend is running
if docker ps | grep -q "frontend"; then
    print_success "Frontend is running"
else
    print_error "Frontend is not running"
    exit 1
fi

print_status "Checking application status..."
echo ""
echo "🔍 Container Status:"
docker-compose ps

echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://your-vps-ip:3000"
echo "   Backend:  http://your-vps-ip:8000"

echo ""
print_success "Simplified Wallet Update Deployed Successfully!"
echo ""
echo "✨ Changes Applied:"
echo "   • Simplified withdrawal form (no payment method selection)"
echo "   • Professional color scheme (slate/gray/emerald)"
echo "   • Improved mobile responsiveness"
echo "   • Admin manual processing for withdrawals"
echo "   • Clean and modern UI design"
echo ""
echo "📱 Test the new wallet interface on your mobile device!"
echo "💼 Withdrawal requests now go directly to admin for manual processing."
