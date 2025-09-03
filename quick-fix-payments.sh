#!/bin/bash

echo "🔧 Quick Fix: Setting up Payment Methods for Withdrawal"
echo "======================================================"

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this from the project root."
    exit 1
fi

print_status "Setting up payment methods..."
docker-compose exec backend python setup_payment_methods.py

if [ $? -eq 0 ]; then
    print_success "Payment methods configured successfully!"
    
    print_status "Restarting backend to refresh payment methods..."
    docker-compose restart backend
    
    sleep 5
    
    print_status "Restarting frontend to refresh data..."
    docker-compose restart frontend
    
    sleep 5
    
    print_success "✅ Setup completed! Now you should see:"
    echo ""
    echo "   🏦 Bank Transfer option"
    echo "   📱 UPI Payment option"  
    echo "   💳 Manual Processing option"
    echo ""
    echo "📱 Try the withdrawal form again - it should work now!"
    echo "👨‍💼 Admin panel should also show withdrawal requests"
    
else
    print_error "Failed to setup payment methods"
    echo ""
    echo "Manual fix:"
    echo "1. Check if backend container is running: docker-compose ps"
    echo "2. Check backend logs: docker-compose logs backend"
    echo "3. Try restarting: docker-compose restart backend"
fi
