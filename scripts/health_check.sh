#!/bin/bash

# Teer Betting Application - Health Check Script
# Monitors all application services and reports status

set -e

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:8000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-5432}
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-6379}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status tracking
OVERALL_STATUS=0
SERVICES_CHECKED=0
SERVICES_HEALTHY=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    SERVICES_HEALTHY=$((SERVICES_HEALTHY + 1))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    OVERALL_STATUS=1
}

check_service() {
    local service_name=$1
    local check_command=$2
    
    SERVICES_CHECKED=$((SERVICES_CHECKED + 1))
    
    if eval "$check_command" >/dev/null 2>&1; then
        log_success "$service_name is healthy"
        return 0
    else
        log_error "$service_name is unhealthy"
        return 1
    fi
}

check_http_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    SERVICES_CHECKED=$((SERVICES_CHECKED + 1))
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 --max-time 30)
    
    if [ "$response_code" = "$expected_status" ]; then
        log_success "$service_name is healthy (HTTP $response_code)"
        return 0
    else
        log_error "$service_name is unhealthy (HTTP $response_code, expected $expected_status)"
        return 1
    fi
}

# Header
echo "🏥 Teer Betting Application - Health Check"
echo "=========================================="
echo "Timestamp: $(date)"
echo ""

# Check Backend API
log_info "Checking Backend API..."
check_http_service "Backend API" "$BACKEND_URL/health"

# Check Backend Database Connection
log_info "Checking Backend Database Connection..."
check_http_service "Backend DB Connection" "$BACKEND_URL/health"

# Check Frontend
log_info "Checking Frontend..."
check_http_service "Frontend" "$FRONTEND_URL/health" "200"

# Check Database directly
log_info "Checking PostgreSQL Database..."
check_service "PostgreSQL Database" "pg_isready -h $DB_HOST -p $DB_PORT"

# Check Redis
log_info "Checking Redis..."
check_service "Redis Server" "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping | grep -q PONG"

# Check Docker containers (if running in Docker)
if command -v docker >/dev/null 2>&1; then
    log_info "Checking Docker containers..."
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Docker containers are running"
        
        # List running containers
        echo ""
        echo "📋 Container Status:"
        docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    else
        log_warning "Docker containers not found or not running"
    fi
fi

# Check API endpoints
log_info "Checking API endpoints..."

# Authentication endpoint
check_http_service "Auth Endpoint" "$BACKEND_URL/api/auth/login" "422"  # Expect validation error without data

# Betting endpoints
check_http_service "Betting Endpoint" "$BACKEND_URL/api/bet/active-rounds"
check_http_service "Houses Endpoint" "$BACKEND_URL/api/bet/houses"

# Rounds endpoints
check_http_service "Rounds Endpoint" "$BACKEND_URL/api/rounds/upcoming"
check_http_service "Results Endpoint" "$BACKEND_URL/api/rounds/results"

# Check API documentation
check_http_service "API Documentation" "$BACKEND_URL/docs"

# Memory and disk usage
log_info "Checking system resources..."

if command -v free >/dev/null 2>&1; then
    MEMORY_USAGE=$(free | grep '^Mem:' | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
        log_warning "High memory usage: ${MEMORY_USAGE}%"
    else
        log_success "Memory usage: ${MEMORY_USAGE}%"
    fi
fi

if command -v df >/dev/null 2>&1; then
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        log_warning "High disk usage: ${DISK_USAGE}%"
    else
        log_success "Disk usage: ${DISK_USAGE}%"
    fi
fi

# Check log files for errors
log_info "Checking for recent errors in logs..."

if [ -f "backend/app.log" ]; then
    ERROR_COUNT=$(grep -c "ERROR" backend/app.log 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        log_warning "Found $ERROR_COUNT errors in backend logs"
    else
        log_success "No errors in backend logs"
    fi
fi

# Performance test
log_info "Running basic performance test..."
if command -v curl >/dev/null 2>&1; then
    RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$BACKEND_URL/health")
    if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "Slow response time: ${RESPONSE_TIME}s"
    else
        log_success "Response time: ${RESPONSE_TIME}s"
    fi
fi

# Summary
echo ""
echo "📊 Health Check Summary"
echo "======================"
echo "Services checked: $SERVICES_CHECKED"
echo "Services healthy: $SERVICES_HEALTHY"
echo "Services unhealthy: $((SERVICES_CHECKED - SERVICES_HEALTHY))"

if [ $OVERALL_STATUS -eq 0 ]; then
    log_success "Overall system status: HEALTHY ✅"
    echo ""
    echo "🎯 Your Teer Betting platform is running perfectly!"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend:  $BACKEND_URL"
    echo "   API Docs: $BACKEND_URL/docs"
else
    log_error "Overall system status: UNHEALTHY ❌"
    echo ""
    echo "⚠️  Some services need attention. Check the errors above."
fi

# Exit with appropriate code
exit $OVERALL_STATUS