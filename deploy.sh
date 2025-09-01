#!/bin/bash
# Comprehensive deployment script for Teer Betting Platform
# This script provides a complete deployment solution
# - Builds and starts Docker containers
# - Sets up admin user
# - Cleans demo data if requested
# - Provides options for rebuilding without cache

set -e  # Exit on any error

# ANSI Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "  _____                 ____       _   _   _                  "
echo " |_   _|__  ___ _ __  | __ )  ___| |_| |_(_)_ __   __ _      "
echo "   | |/ _ \/ _ \ '__| |  _ \ / _ \ __| __| | '_ \ / _\` |     "
echo "   | |  __/  __/ |    | |_) |  __/ |_| |_| | | | | (_| |     "
echo "   |_|\___|\___|_|    |____/ \___|\__|\__|_|_| |_|\__, |     "
echo "                                                  |___/      "
echo -e "${NC}"
echo -e "${CYAN}Comprehensive Deployment Script${NC}"
echo -e "${YELLOW}----------------------------------${NC}"

# Function to display usage
usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  $0 [options]"
    echo
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${GREEN}--rebuild${NC}        Rebuild all containers with no cache"
    echo -e "  ${GREEN}--clean${NC}          Remove all demo data, keep admin users"
    echo -e "  ${GREEN}--stop${NC}           Stop all containers"
    echo -e "  ${GREEN}--restart${NC}        Restart all containers"
    echo -e "  ${GREEN}--help${NC}           Show this help message"
    echo
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  $0                  # Normal deployment"
    echo -e "  $0 --rebuild --clean  # Full rebuild and data cleanup"
}

# Function to check if Docker is running
check_docker() {
    echo -e "${BLUE}Checking if Docker is running...${NC}"
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running or not accessible${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker is running${NC}"
}

# Function to build and start containers
start_containers() {
    local no_cache=$1
    
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    if [ "$no_cache" = true ]; then
        echo -e "${YELLOW}Building containers with --no-cache...${NC}"
        docker-compose build --no-cache
    else
        echo -e "${YELLOW}Building containers...${NC}"
        docker-compose build
    fi
    
    echo -e "${YELLOW}Starting containers...${NC}"
    docker-compose up -d
    
    # Wait for backend to be healthy
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    attempt=1
    max_attempts=30
    
    while [ $attempt -le $max_attempts ]; do
        echo -ne "${YELLOW}Attempt $attempt/$max_attempts: Checking backend status...${NC}\r"
        
        if docker ps | grep teer_backend | grep -q "(healthy)"; then
            echo -e "\n${GREEN}✓ Backend is healthy!${NC}"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e "\n${RED}Backend failed to become healthy after $max_attempts attempts${NC}"
            echo -e "${YELLOW}Checking backend logs:${NC}"
            docker-compose logs --tail=50 backend
            
            echo -e "${YELLOW}Deployment may be incomplete. Please check the logs for errors.${NC}"
            exit 1
        fi
        
        attempt=$((attempt+1))
        sleep 5
    done
}

# Function to clean demo data
clean_demo_data() {
    echo -e "${BLUE}Cleaning demo data...${NC}"
    
    # Check if backend container is running
    if ! docker ps | grep -q teer_backend; then
        echo -e "${RED}Error: Backend container is not running${NC}"
        exit 1
    fi
    
    # Execute cleanup script
    docker-compose exec -T backend python cleanup_demo_data.py
    
    echo -e "${GREEN}✓ Demo data cleanup completed${NC}"
}

# Function to create admin user
create_admin() {
    echo -e "${BLUE}Ensuring admin user exists...${NC}"
    
    # Check if backend container is running
    if ! docker ps | grep -q teer_backend; then
        echo -e "${RED}Error: Backend container is not running${NC}"
        exit 1
    fi
    
    # Execute admin creation script
    docker-compose exec -T backend python create_admin_user.py
    
    echo -e "${GREEN}✓ Admin user check completed${NC}"
}

# Function to stop containers
stop_containers() {
    echo -e "${BLUE}Stopping containers...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Containers stopped${NC}"
}

# Parse arguments
REBUILD=false
CLEAN=false
STOP=false
RESTART=false

for arg in "$@"; do
    case $arg in
        --rebuild)
            REBUILD=true
            ;;
        --clean)
            CLEAN=true
            ;;
        --stop)
            STOP=true
            ;;
        --restart)
            RESTART=true
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            usage
            exit 1
            ;;
    esac
done

# Main execution
check_docker

if [ "$STOP" = true ]; then
    stop_containers
    exit 0
fi

if [ "$RESTART" = true ]; then
    stop_containers
    start_containers false
    exit 0
fi

# Start containers
start_containers $REBUILD

# Create admin user
create_admin

# Clean demo data if requested
if [ "$CLEAN" = true ]; then
    clean_demo_data
fi

# Display success message
echo -e "\n${GREEN}===========================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}===========================${NC}"
echo
echo -e "${CYAN}Services:${NC}"
echo -e "  ${YELLOW}Frontend:${NC} http://localhost:80"
echo -e "  ${YELLOW}Backend API:${NC} http://localhost:8001/api/v1"
echo -e "  ${YELLOW}API Docs:${NC} http://localhost:8001/api/v1/docs"
echo -e "  ${YELLOW}Database:${NC} localhost:5434"
echo -e "  ${YELLOW}PgAdmin:${NC} http://localhost:5050"
echo
echo -e "${CYAN}Default admin credentials:${NC}"
echo -e "  ${YELLOW}Username:${NC} admin"
echo -e "  ${YELLOW}Password:${NC} AdminSecure123!"
echo
echo -e "${RED}IMPORTANT: Change the default admin password after first login!${NC}"
echo -e "${YELLOW}----------------------------------${NC}"
