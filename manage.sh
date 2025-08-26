#!/bin/bash

# =============================================================================
# TEER BETTING APP - DOCKER MANAGEMENT SCRIPT
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_compose() {
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available"
        exit 1
    fi
}

# Development environment
dev() {
    print_header "Starting Development Environment"
    check_docker
    check_compose
    
    print_status "Starting development services..."
    $COMPOSE_CMD -f docker-compose.yml -f docker-compose.development.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_status "Development environment is ready!"
    echo -e "${GREEN}Services:${NC}"
    echo -e "  • Frontend: ${BLUE}http://localhost${NC}"
    echo -e "  • Backend API: ${BLUE}http://localhost:8001${NC}"
    echo -e "  • API Docs: ${BLUE}http://localhost:8001/docs${NC}"
    echo -e "  • pgAdmin: ${BLUE}http://localhost:5050${NC} (admin@teer.dev / admin123)"
    echo -e "  • Redis Commander: ${BLUE}http://localhost:8081${NC}"
    echo -e "  • Mailhog: ${BLUE}http://localhost:8025${NC}"
    echo -e "  • File Browser: ${BLUE}http://localhost:8080${NC}"
}

# Production environment
prod() {
    print_header "Starting Production Environment"
    check_docker
    check_compose
    
    if [ ! -f .env.production ]; then
        print_error ".env.production file not found. Please create it from .env.template"
        exit 1
    fi
    
    print_status "Starting production services..."
    $COMPOSE_CMD -f docker-compose.production.yml --env-file .env.production up -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    print_status "Production environment is ready!"
    echo -e "${GREEN}Services:${NC}"
    echo -e "  • Application: ${BLUE}https://localhost${NC}"
    echo -e "  • Monitoring: ${BLUE}http://localhost:3000${NC}"
}

# Full environment with monitoring
full() {
    print_header "Starting Full Environment with Monitoring"
    check_docker
    check_compose
    
    print_status "Starting all services..."
    $COMPOSE_CMD -f docker-compose.full.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 20
    
    print_status "Full environment is ready!"
    echo -e "${GREEN}Services:${NC}"
    echo -e "  • Frontend: ${BLUE}http://localhost${NC}"
    echo -e "  • Backend API: ${BLUE}http://localhost:8001${NC}"
    echo -e "  • pgAdmin: ${BLUE}http://localhost:5050${NC}"
    echo -e "  • Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo -e "  • Grafana: ${BLUE}http://localhost:3000${NC}"
    echo -e "  • Kibana: ${BLUE}http://localhost:5601${NC}"
    echo -e "  • Load Balancer: ${BLUE}http://localhost:8080${NC}"
}

# Stop all services
stop() {
    print_header "Stopping All Services"
    check_compose
    
    print_status "Stopping development environment..."
    $COMPOSE_CMD -f docker-compose.yml -f docker-compose.development.yml down 2>/dev/null || true
    
    print_status "Stopping production environment..."
    $COMPOSE_CMD -f docker-compose.production.yml down 2>/dev/null || true
    
    print_status "Stopping full environment..."
    $COMPOSE_CMD -f docker-compose.full.yml down 2>/dev/null || true
    
    print_status "All services stopped."
}

# Clean up everything
clean() {
    print_header "Cleaning Up Docker Resources"
    check_compose
    
    print_warning "This will remove all containers, volumes, and networks for this project."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping all services..."
        stop
        
        print_status "Removing volumes..."
        docker volume ls -q | grep teer | xargs -r docker volume rm 2>/dev/null || true
        
        print_status "Removing networks..."
        docker network ls -q | grep teer | xargs -r docker network rm 2>/dev/null || true
        
        print_status "Pruning unused Docker resources..."
        docker system prune -f
        
        print_status "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Show logs
logs() {
    local service=$2
    local environment=${3:-development}
    
    case $environment in
        dev|development)
            compose_files="-f docker-compose.yml -f docker-compose.development.yml"
            ;;
        prod|production)
            compose_files="-f docker-compose.production.yml"
            ;;
        full)
            compose_files="-f docker-compose.full.yml"
            ;;
        *)
            compose_files="-f docker-compose.yml"
            ;;
    esac
    
    if [ -n "$service" ]; then
        print_status "Showing logs for $service in $environment environment..."
        $COMPOSE_CMD $compose_files logs -f "$service"
    else
        print_status "Showing logs for all services in $environment environment..."
        $COMPOSE_CMD $compose_files logs -f
    fi
}

# Backup database
backup() {
    print_header "Creating Database Backup"
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_dir="./backups"
    
    mkdir -p "$backup_dir"
    
    print_status "Creating backup: $backup_name"
    docker exec teer_db pg_dump -U postgres -d teer_betting > "$backup_dir/$backup_name"
    
    print_status "Backup created: $backup_dir/$backup_name"
}

# Restore database
restore() {
    local backup_file=$2
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file: ./manage.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_header "Restoring Database from Backup"
    print_warning "This will overwrite the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restoring from: $backup_file"
        docker exec -i teer_db psql -U postgres -d teer_betting < "$backup_file"
        print_status "Database restored successfully."
    else
        print_status "Restore cancelled."
    fi
}

# Show status
status() {
    print_header "Docker Services Status"
    check_compose
    
    print_status "Current containers:"
    docker ps -a --filter "name=teer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo
    print_status "Volume usage:"
    docker volume ls --filter "name=teer" --format "table {{.Name}}\t{{.Driver}}"
    
    echo
    print_status "Network information:"
    docker network ls --filter "name=teer" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
}

# Show help
help() {
    echo -e "${BLUE}Teer Betting App - Docker Management Script${NC}"
    echo
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo
    echo "Commands:"
    echo "  dev                    Start development environment"
    echo "  prod                   Start production environment"
    echo "  full                   Start full environment with monitoring"
    echo "  stop                   Stop all running services"
    echo "  clean                  Remove all containers, volumes, and networks"
    echo "  logs [service] [env]   Show logs (env: dev/prod/full)"
    echo "  backup                 Create database backup"
    echo "  restore <file>         Restore database from backup"
    echo "  status                 Show current status of all services"
    echo "  help                   Show this help message"
    echo
    echo "Examples:"
    echo "  $0 dev                 # Start development environment"
    echo "  $0 logs backend dev    # Show backend logs in development"
    echo "  $0 backup              # Create database backup"
    echo "  $0 clean               # Clean up everything"
}

# Main script logic
case $1 in
    dev|development)
        dev
        ;;
    prod|production)
        prod
        ;;
    full)
        full
        ;;
    stop)
        stop
        ;;
    clean)
        clean
        ;;
    logs)
        logs "$@"
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$@"
        ;;
    status)
        status
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        help
        exit 1
        ;;
esac
