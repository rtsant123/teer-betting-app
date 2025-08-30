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

#!/bin/bash

# =================================================================
# TEER BETTING APP - HEALTH CHECK SCRIPT
# =================================================================
# This script monitors the health of all application components
# =================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/teer-betting-app"
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_LOG="/var/log/teer-health.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Function to log with timestamp
log_health() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $HEALTH_LOG
}

# Check if running from correct directory
if [ ! -f "$APP_DIR/$COMPOSE_FILE" ]; then
    print_error "Docker compose file not found. Please run from $APP_DIR"
    exit 1
fi

cd $APP_DIR

echo "🏥 Teer Betting App - Health Check Report"
echo "========================================"
echo "Time: $(date)"
echo ""

# 1. Check Docker service
print_info "Checking Docker service..."
if systemctl is-active --quiet docker; then
    print_status "Docker service is running"
    log_health "Docker service: OK"
else
    print_error "Docker service is not running"
    log_health "Docker service: FAILED"
    exit 1
fi

# 2. Check container status
print_info "Checking container status..."
containers=("teer_frontend_prod" "teer_backend_prod" "teer_db_prod" "teer_redis_prod")
container_health=0

for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --filter "status=running" | grep -q $container; then
        uptime=$(docker ps --filter "name=$container" --format "{{.Status}}")
        print_status "$container: Running ($uptime)"
        log_health "$container: Running"
    else
        print_error "$container: Not running"
        log_health "$container: FAILED"
        container_health=1
    fi
done

# 3. Check application endpoints
print_info "Checking application endpoints..."

# Frontend health
if curl -f -s --max-time 10 http://localhost > /dev/null; then
    print_status "Frontend: Responding"
    log_health "Frontend: OK"
else
    print_error "Frontend: Not responding"
    log_health "Frontend: FAILED"
fi

# Backend API health
if curl -f -s --max-time 10 http://localhost:8001/health > /dev/null; then
    print_status "Backend API: Responding"
    log_health "Backend API: OK"
    
    # Test specific API endpoint
    if curl -f -s --max-time 10 http://localhost:8001/api/v1/rounds/houses > /dev/null; then
        print_status "Backend API endpoints: Working"
        log_health "Backend API endpoints: OK"
    else
        print_warning "Backend API: Core endpoint may have issues"
        log_health "Backend API endpoints: WARNING"
    fi
else
    print_error "Backend API: Not responding"
    log_health "Backend API: FAILED"
fi

# Database health
if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U teer_admin > /dev/null 2>&1; then
    print_status "Database: Connected"
    log_health "Database: OK"
else
    print_error "Database: Connection failed"
    log_health "Database: FAILED"
fi

# 4. Check resource usage
print_info "Checking resource usage..."

# Memory usage
MEMORY_USAGE=$(free | awk 'FNR==2{printf "%.0f", ($3/($3+$4))*100}')
if [ "$MEMORY_USAGE" -lt 85 ]; then
    print_status "Memory usage: ${MEMORY_USAGE}%"
else
    print_warning "Memory usage: ${MEMORY_USAGE}% (High)"
fi
log_health "Memory usage: ${MEMORY_USAGE}%"

# Disk usage
DISK_USAGE=$(df / | awk 'FNR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 85 ]; then
    print_status "Disk usage: ${DISK_USAGE}%"
else
    print_warning "Disk usage: ${DISK_USAGE}% (High)"
fi
log_health "Disk usage: ${DISK_USAGE}%"

# CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
print_info "CPU load average: $CPU_LOAD"
log_health "CPU load: $CPU_LOAD"

# 5. Check Docker container resources
print_info "Checking container resource usage..."
docker stats --no-stream --format "table {{.Container}}	{{.CPUPerc}}	{{.MemUsage}}" | grep teer_ || print_warning "Could not get container stats"

# 6. Check log sizes
print_info "Checking log file sizes..."
LOG_SIZE=$(du -sh /var/log/teer-*.log 2>/dev/null | awk '{total+=$1} END {print total"K"}' || echo "No logs")
print_info "Log files size: $LOG_SIZE"

# 7. Network connectivity test
print_info "Testing external connectivity..."
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    print_status "Internet connectivity: OK"
else
    print_warning "Internet connectivity: Issues detected"
fi

# 8. Generate summary
echo ""
echo "📊 Health Check Summary"
echo "======================"

if [ $container_health -eq 0 ]; then
    print_status "All containers are running"
    OVERALL_STATUS="HEALTHY"
else
    print_error "Some containers have issues"
    OVERALL_STATUS="UNHEALTHY"
fi

# Check if any critical issues
CRITICAL_ISSUES=0
if ! curl -f -s --max-time 5 http://localhost > /dev/null; then
    CRITICAL_ISSUES=1
fi
if ! curl -f -s --max-time 5 http://localhost:8001/health > /dev/null; then
    CRITICAL_ISSUES=1
fi

if [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🟢 Overall Status: HEALTHY${NC}"
    log_health "Overall status: HEALTHY"
else
    echo -e "${RED}🔴 Overall Status: CRITICAL ISSUES DETECTED${NC}"
    log_health "Overall status: CRITICAL"
    
    echo ""
    echo "🚨 Recommended Actions:"
    echo "1. Check application logs: ~/teer-logs.sh"
    echo "2. Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo "3. Check system resources: htop"
    echo "4. Review error logs: tail -f /var/log/teer-*.log"
fi

# 9. Generate alerts if needed
if [ $CRITICAL_ISSUES -eq 1 ] || [ "$MEMORY_USAGE" -gt 90 ] || [ "$DISK_USAGE" -gt 90 ]; then
    echo ""
    echo "🚨 ALERT: Critical issues detected!"
    echo "Timestamp: $(date)"
    echo "Issues: Container health=$container_health, Memory=${MEMORY_USAGE}%, Disk=${DISK_USAGE}%"
    
    # Log critical alert
    log_health "CRITICAL ALERT: Issues detected - Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%"
    
    # Could send notification here (email, webhook, etc.)
fi

echo ""
echo "📋 Quick Commands:"
echo "View logs: ~/teer-logs.sh"
echo "App status: ~/teer-status.sh"
echo "Restart app: cd $APP_DIR && docker-compose -f $COMPOSE_FILE restart"

# Exit with appropriate code
if [ $CRITICAL_ISSUES -eq 0 ]; then
    exit 0
else
    exit 1
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