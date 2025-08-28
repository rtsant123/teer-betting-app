#!/bin/bash

# 🔧 QUICK RECOVERY SCRIPT - Emergency fixes for common issues
# Use this script when services are not starting properly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[RECOVERY] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

log "🔧 Starting Quick Recovery Process..."

# Step 1: Force stop all containers
log "Step 1: Force stopping all containers..."
docker-compose down --remove-orphans || warn "Some containers could not be stopped"
docker stop $(docker ps -aq) 2>/dev/null || info "No containers to stop"

# Step 2: Clean up resources
log "Step 2: Cleaning up Docker resources..."
docker system prune -f || warn "Could not prune system"
docker volume prune -f || warn "Could not prune volumes"

# Step 3: Remove problematic containers and images
log "Step 3: Removing old containers and images..."
docker container prune -f || warn "Could not prune containers"
docker image prune -f || warn "Could not prune images"

# Step 4: Reset database volume (WARNING: This will delete all data)
read -p "⚠️  Do you want to reset the database? This will DELETE ALL DATA! (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    warn "Removing database volume..."
    docker volume rm teer-betting-app_postgres_data 2>/dev/null || info "Database volume not found"
    log "✅ Database volume removed"
else
    info "Database volume preserved"
fi

# Step 5: Rebuild and restart with fresh configuration
log "Step 4: Rebuilding application with fresh configuration..."
docker-compose build --no-cache
docker-compose up -d

# Step 6: Wait for services
log "Step 5: Waiting for services to be ready..."
sleep 30

# Step 7: Check status
log "Step 6: Checking service status..."
docker-compose ps

log "🎉 Quick recovery completed!"
log "📱 Access your application at:"
log "   Frontend: http://localhost:3000"
log "   Backend: http://localhost:8001"
log "   API Docs: http://localhost:8001/docs"
