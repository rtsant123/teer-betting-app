#!/bin/bash

# 🚀 TEER BETTING APP - PRODUCTION DEPLOYMENT SCRIPT
# Enhanced deployment with comprehensive error handling and monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Create necessary directories
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

log "🚀 Starting Teer Betting App Deployment"
log "📅 Date: $(date)"
log "🖥️  Host: $(hostname)"
log "👤 User: $(whoami)"

# Step 1: Pre-deployment checks
log "🔍 Step 1: Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    error "docker-compose is not installed"
    exit 1
fi

# Check available disk space (at least 2GB)
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 2097152 ]; then
    warn "Low disk space available: $(($AVAILABLE_SPACE / 1024))MB"
fi

log "✅ Pre-deployment checks passed"

# Step 2: Backup existing data (if any)
log "💾 Step 2: Creating backup of existing data..."

BACKUP_TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP.tar.gz"

if docker volume ls | grep -q teer-betting-app_postgres_data; then
    info "Creating database backup..."
    docker run --rm \
        -v teer-betting-app_postgres_data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine:latest \
        tar czf "/backup/postgres_data_$BACKUP_TIMESTAMP.tar.gz" -C /data .
    log "✅ Database backup created: postgres_data_$BACKUP_TIMESTAMP.tar.gz"
else
    info "No existing database volume found - skipping backup"
fi

# Step 3: Stop existing services
log "⏹️  Step 3: Stopping existing services..."

if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    info "Stopping running services..."
    docker-compose -f "$COMPOSE_FILE" down
    log "✅ Services stopped"
else
    info "No running services found"
fi

# Step 4: Clean up old resources
log "🧹 Step 4: Cleaning up old resources..."

# Remove dangling images
DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
if [ -n "$DANGLING_IMAGES" ]; then
    info "Removing dangling images..."
    docker rmi $DANGLING_IMAGES || warn "Some images could not be removed"
fi

# Prune unused volumes (with confirmation)
info "Pruning unused Docker volumes..."
docker volume prune -f || warn "Could not prune volumes"

log "✅ Cleanup completed"

# Step 5: Build and start services
log "🏗️  Step 5: Building and starting services..."

# Build with no cache for fresh start
info "Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache --parallel

# Start services
info "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

log "✅ Services started"

# Step 6: Health checks
log "🏥 Step 6: Running health checks..."

# Wait for services to be ready
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_INTERVAL=10  # 10 seconds
ELAPSED=0

info "Waiting for services to be healthy..."

while [ $ELAPSED -lt $HEALTH_CHECK_TIMEOUT ]; do
    # Check database health
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres -d teer_betting > /dev/null 2>&1; then
        DB_HEALTHY=true
    else
        DB_HEALTHY=false
    fi
    
    # Check backend health
    if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
    else
        BACKEND_HEALTHY=false
    fi
    
    # Check frontend health
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_HEALTHY=true
    else
        FRONTEND_HEALTHY=false
    fi
    
    if [ "$DB_HEALTHY" = true ] && [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
        log "✅ All services are healthy!"
        break
    fi
    
    info "Health check progress: DB:$DB_HEALTHY Backend:$BACKEND_HEALTHY Frontend:$FRONTEND_HEALTHY (${ELAPSED}s/${HEALTH_CHECK_TIMEOUT}s)"
    sleep $HEALTH_CHECK_INTERVAL
    ELAPSED=$((ELAPSED + HEALTH_CHECK_INTERVAL))
done

if [ $ELAPSED -ge $HEALTH_CHECK_TIMEOUT ]; then
    error "Health check timeout - some services may not be ready"
    docker-compose -f "$COMPOSE_FILE" ps
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi

# Step 7: Run database migrations
log "🗃️  Step 7: Running database migrations..."

info "Executing Alembic migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head

log "✅ Database migrations completed"

# Step 8: Final verification
log "🔍 Step 8: Final verification..."

# Show running services
info "Running services:"
docker-compose -f "$COMPOSE_FILE" ps

# Show resource usage
info "Resource usage:"
docker stats --no-stream

# Test API endpoints
info "Testing API endpoints..."
if curl -sf http://localhost:8001/api/v1/health > /dev/null 2>&1; then
    log "✅ Backend API is responding"
else
    warn "Backend API health check failed"
fi

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Frontend is responding"
else
    warn "Frontend health check failed"
fi

# Step 9: Generate deployment report
log "📊 Step 9: Generating deployment report..."

REPORT_FILE="$LOG_DIR/deployment_report_$BACKUP_TIMESTAMP.txt"

cat > "$REPORT_FILE" << EOF
TEER BETTING APP - DEPLOYMENT REPORT
====================================
Date: $(date)
Host: $(hostname)
User: $(whoami)
Deployment Time: $(date +'%Y-%m-%d %H:%M:%S')

SERVICES STATUS:
$(docker-compose -f "$COMPOSE_FILE" ps)

RESOURCE USAGE:
$(docker stats --no-stream)

DOCKER IMAGES:
$(docker images | grep teer)

DOCKER VOLUMES:
$(docker volume ls | grep teer)

NETWORK CONFIGURATION:
$(docker network ls | grep teer)

ENDPOINTS:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs
- Database: localhost:5434

LOGS LOCATION:
- Deployment logs: $LOG_DIR/
- Container logs: docker-compose logs

BACKUP LOCATION:
- Backups: $BACKUP_DIR/

EOF

log "✅ Deployment report saved: $REPORT_FILE"

# Success message
log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "📱 Application URLs:"
log "   Frontend: http://localhost:3000"
log "   Backend API: http://localhost:8001"
log "   API Docs: http://localhost:8001/docs"
log "   Database: localhost:5434"
log ""
log "📋 Useful commands:"
log "   View logs: docker-compose logs -f"
log "   Stop services: docker-compose down"
log "   Restart services: docker-compose restart"
log "   View status: docker-compose ps"
log ""
log "📊 Deployment report: $REPORT_FILE"
log "💾 Backups available in: $BACKUP_DIR/"

# Optional: Show recent logs
info "Recent application logs (last 20 lines):"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

log "🚀 Deployment script completed successfully!"
