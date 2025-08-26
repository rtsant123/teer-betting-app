#!/bin/bash

# Teer Betting Application - Production Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: dev, staging, production

set -e

ENVIRONMENT=${1:-dev}
PROJECT_NAME="teer-betting-app"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Deploying Teer Betting Application to $ENVIRONMENT environment..."

# Color codes for output
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Created .env from .env.example. Please review and update the values."
        else
            print_error ".env.example not found. Please create environment configuration."
            exit 1
        fi
    fi
    
    # Environment-specific configurations
    case $ENVIRONMENT in
        production)
            COMPOSE_FILE="docker-compose.prod.yml"
            print_status "Using production configuration"
            ;;
        staging)
            COMPOSE_FILE="docker-compose.staging.yml"
            print_status "Using staging configuration"
            ;;
        dev)
            print_status "Using development configuration"
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop existing services
    docker-compose -f $COMPOSE_FILE down --volumes --remove-orphans
    
    # Pull latest images and build
    docker-compose -f $COMPOSE_FILE pull
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Start services
    docker-compose -f $COMPOSE_FILE up -d
    
    print_success "Services started successfully"
}

# Initialize database
initialize_database() {
    print_status "Initializing database..."
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Check if backend container is running
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "backend.*Up"; then
        print_error "Backend container is not running"
        exit 1
    fi
    
    # Run database initialization
    docker-compose -f $COMPOSE_FILE exec -T backend python init_db.py
    
    print_success "Database initialized successfully"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check backend health
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:8000/health &>/dev/null; then
            print_success "Backend health check passed"
            break
        fi
        
        attempt=$((attempt + 1))
        print_status "Waiting for backend to be ready... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost &>/dev/null; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed - may still be starting"
    fi
    
    # Check database
    if docker-compose -f $COMPOSE_FILE exec -T db pg_isready &>/dev/null; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        exit 1
    fi
}

# Display deployment info
show_deployment_info() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Service Information:"
    echo "  Frontend:  http://localhost"
    echo "  Backend:   http://localhost:8000"
    echo "  API Docs:  http://localhost:8000/docs"
    echo "  pgAdmin:   http://localhost:5050"
    echo ""
    echo "🔑 Demo Credentials:"
    echo "  Admin:     username: admin, password: admin123"
    echo "  User:      username: testuser1, password: test123"
    echo "  pgAdmin:   email: admin@teer.com, password: admin"
    echo ""
    echo "📊 Container Status:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    echo "📝 Logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "🛑 Stop:  docker-compose -f $COMPOSE_FILE down"
}

# Backup existing data
backup_data() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Creating backup..."
        timestamp=$(date +"%Y%m%d_%H%M%S")
        backup_dir="backups/$timestamp"
        mkdir -p $backup_dir
        
        # Backup database
        docker-compose -f $COMPOSE_FILE exec -T db pg_dump -U postgres teer_betting > "$backup_dir/database.sql"
        
        print_success "Backup created in $backup_dir"
    fi
}

# Main deployment flow
main() {
    echo "════════════════════════════════════════════════"
    echo "   🎯 TEER BETTING APPLICATION DEPLOYMENT"
    echo "   Environment: $ENVIRONMENT"
    echo "   Timestamp: $(date)"
    echo "════════════════════════════════════════════════"
    echo ""
    
    check_prerequisites
    setup_environment
    
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_data
    fi
    
    deploy_services
    initialize_database
    health_check
    show_deployment_info
    
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🚀 Your Teer Betting platform is now live!"
}

# Run main function
main