#!/bin/bash

# Teer Betting Application - Setup Script
# Automated setup for development and production environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="Teer Betting Platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo ""
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install system dependencies based on OS
install_system_deps() {
    print_step "Installing system dependencies..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists apt-get; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential python3 python3-pip python3-venv nodejs npm postgresql postgresql-contrib redis-server
        elif command_exists yum; then
            # CentOS/RHEL
            sudo yum update -y
            sudo yum install -y curl wget git gcc python3 python3-pip nodejs npm postgresql postgresql-server redis
        elif command_exists pacman; then
            # Arch Linux
            sudo pacman -Syu --noconfirm curl wget git base-devel python python-pip nodejs npm postgresql redis
        else
            print_warning "Unsupported Linux distribution. Please install dependencies manually."
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install curl wget git python3 node postgresql redis
        else
            print_error "Homebrew not found. Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    else
        print_warning "Unsupported operating system. Please install dependencies manually."
    fi
    
    print_success "System dependencies installed"
}

# Install Docker
install_docker() {
    print_step "Installing Docker..."
    
    if command_exists docker; then
        print_info "Docker is already installed"
        docker --version
    else
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Install Docker on Linux
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            print_warning "Please log out and log back in for Docker group changes to take effect"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            print_error "Please install Docker Desktop for Mac from https://docs.docker.com/docker-for-mac/install/"
            exit 1
        fi
    fi
    
    # Install Docker Compose
    if command_exists docker-compose; then
        print_info "Docker Compose is already installed"
        docker-compose --version
    else
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
    fi
    
    print_success "Docker installation completed"
}

# Setup environment variables
setup_environment() {
    print_step "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            
            # Generate secure secret key
            if command_exists openssl; then
                SECRET_KEY=$(openssl rand -hex 32)
                sed -i.bak "s/your-secret-key-change-in-production/$SECRET_KEY/g" .env
                print_success "Generated secure secret key"
            elif command_exists python3; then
                SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
                sed -i.bak "s/your-secret-key-change-in-production/$SECRET_KEY/g" .env
                print_success "Generated secure secret key"
            fi
            
            print_warning "Please review and update .env file with your configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_info ".env file already exists"
    fi
}

# Install backend dependencies
setup_backend() {
    print_step "Setting up backend..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Created Python virtual environment"
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    print_success "Backend dependencies installed"
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    print_step "Setting up frontend..."
    
    cd frontend
    
    # Install Node.js dependencies
    npm install
    
    print_success "Frontend dependencies installed"
    cd ..
}

# Initialize database
setup_database() {
    print_step "Setting up database..."
    
    # Start database if using Docker
    if command_exists docker-compose; then
        docker-compose up -d db
        sleep 5
        
        # Initialize database with dummy data
        docker-compose exec -T backend python init_db.py
        
        print_success "Database initialized with dummy data"
    else
        print_warning "Docker not available. Please setup PostgreSQL manually and run 'python backend/init_db.py'"
    fi
}

# Create directory structure
create_directories() {
    print_step "Creating directory structure..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p backups
    mkdir -p uploads
    mkdir -p ssl
    
    # Backend directories
    mkdir -p backend/logs
    mkdir -p backend/uploads
    
    # Frontend directories
    mkdir -p frontend/build
    
    print_success "Directory structure created"
}

# Set permissions
set_permissions() {
    print_step "Setting file permissions..."
    
    # Make scripts executable
    chmod +x setup.sh
    chmod +x deploy.sh
    [ -f scripts/backup.sh ] && chmod +x scripts/backup.sh
    [ -f scripts/health_check.sh ] && chmod +x scripts/health_check.sh
    
    print_success "File permissions set"
}

# Validate installation
validate_installation() {
    print_step "Validating installation..."
    
    # Check required commands
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists python3; then
        missing_deps+=("python3")
    fi
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        print_success "All dependencies are installed"
    else
        print_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    # Check if .env exists
    if [ -f .env ]; then
        print_success ".env file exists"
    else
        print_error ".env file not found"
        return 1
    fi
    
    return 0
}

# Run health check
run_health_check() {
    print_step "Running health check..."
    
    if [ -f scripts/health_check.sh ]; then
        chmod +x scripts/health_check.sh
        ./scripts/health_check.sh
    else
        print_info "Health check script not found, skipping..."
    fi
}

# Display final instructions
show_completion_message() {
    print_header "🎉 SETUP COMPLETED SUCCESSFULLY!"
    
    echo -e "${GREEN}Your Teer Betting Platform is ready!${NC}"
    echo ""
    echo -e "${CYAN}📋 What's been set up:${NC}"
    echo "  ✅ System dependencies"
    echo "  ✅ Docker and Docker Compose"
    echo "  ✅ Backend Python environment"
    echo "  ✅ Frontend Node.js dependencies"
    echo "  ✅ Environment configuration"
    echo "  ✅ Database with dummy data"
    echo "  ✅ Directory structure"
    echo ""
    echo -e "${CYAN}🚀 Quick Start Commands:${NC}"
    echo "  Start development:  make dev"
    echo "  Start with Docker:  docker-compose up -d"
    echo "  Run health check:   make health-check"
    echo "  View all commands:  make help"
    echo ""
    echo -e "${CYAN}🔑 Demo Credentials:${NC}"
    echo "  Admin:  username: admin,     password: admin123"
    echo "  User:   username: testuser1, password: test123 (₹1,000 balance)"
    echo ""
    echo -e "${CYAN}🌐 Application URLs:${NC}"
    echo "  Frontend:  http://localhost"
    echo "  Backend:   http://localhost:8000"
    echo "  API Docs:  http://localhost:8000/docs"
    echo "  pgAdmin:   http://localhost:5050"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "  1. Review and update .env file with your settings"
    echo "  2. Change default passwords before production"
    echo "  3. Configure SSL certificates for production"
    echo "  4. Set up proper backup procedures"
    echo ""
    echo -e "${GREEN}Happy betting! 🎯${NC}"
}

# Main setup function
main() {
    print_header "🎯 $PROJECT_NAME - Automated Setup"
    
    print_info "This script will set up your complete Teer Betting Platform"
    print_info "Detected OS: $OSTYPE"
    
    # Confirm setup
    read -p "Do you want to proceed with the setup? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Run setup steps
    create_directories
    set_permissions
    
    # Ask about system dependencies
    if ! command_exists docker || ! command_exists python3 || ! command_exists node; then
        read -p "Install system dependencies (Docker, Python, Node.js)? [Y/n] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            install_system_deps
            install_docker
        fi
    fi
    
    setup_environment
    
    # Setup application components
    if [ -d "backend" ]; then
        setup_backend
    fi
    
    if [ -d "frontend" ]; then
        setup_frontend
    fi
    
    # Setup database
    read -p "Initialize database with Docker? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        setup_database
    fi
    
    # Validate installation
    if validate_installation; then
        show_completion_message
        
        # Optional health check
        read -p "Run health check? [Y/n] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            run_health_check
        fi
    else
        print_error "Setup validation failed. Please check the errors above."
        exit 1
    fi
}

# Handle script termination
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended for development setup"
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run main setup
main "$@"