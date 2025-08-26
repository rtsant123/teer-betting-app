#!/bin/bash

# Teer Betting Application - Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${POSTGRES_DB:-teer_betting}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-password}

BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/teer_betting_backup_$TIMESTAMP.sql"
COMPRESSED_BACKUP="$BACKUP_FILE.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to check database connection
check_db_connection() {
    log_info "Checking database connection..."
    
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        log_info "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Function to create backup
create_backup() {
    log_info "Starting database backup..."
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        > "$BACKUP_FILE" 2>/dev/null; then
        
        log_info "Database backup completed: $BACKUP_FILE"
        
        # Compress backup
        if gzip "$BACKUP_FILE"; then
            log_info "Backup compressed: $COMPRESSED_BACKUP"
            
            # Get file size
            SIZE=$(ls -lah "$COMPRESSED_BACKUP" | awk '{print $5}')
            log_info "Backup size: $SIZE"
            
            return 0
        else
            log_error "Failed to compress backup"
            return 1
        fi
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    # Find and delete backups older than retention period
    find "$BACKUP_DIR" -name "teer_betting_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Count remaining backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "teer_betting_backup_*.sql.gz" -type f | wc -l)
    log_info "Total backups retained: $BACKUP_COUNT"
}

# Function to verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    if gzip -t "$COMPRESSED_BACKUP" >/dev/null 2>&1; then
        log_info "Backup integrity check passed"
        return 0
    else
        log_error "Backup integrity check failed"
        return 1
    fi
}

# Function to send notification (placeholder)
send_notification() {
    local status=$1
    local message=$2
    
    # Placeholder for notification service (email, Slack, etc.)
    log_info "Notification: $status - $message"
    
    # Example: Send to webhook
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"Backup $status: $message\"}" \
    #   "$WEBHOOK_URL"
}

# Main backup process
main() {
    log_info "=== Teer Betting Database Backup Started ==="
    
    # Check prerequisites
    if ! command -v pg_dump >/dev/null 2>&1; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v gzip >/dev/null 2>&1; then
        log_error "gzip not found. Please install gzip."
        exit 1
    fi
    
    # Check database connection
    if ! check_db_connection; then
        send_notification "FAILED" "Database connection failed"
        exit 1
    fi
    
    # Create backup
    if create_backup; then
        # Verify backup
        if verify_backup; then
            # Cleanup old backups
            cleanup_old_backups
            
            log_info "=== Backup completed successfully ==="
            send_notification "SUCCESS" "Backup created: $COMPRESSED_BACKUP"
        else
            log_error "Backup verification failed"
            send_notification "FAILED" "Backup verification failed"
            exit 1
        fi
    else
        log_error "Backup creation failed"
        send_notification "FAILED" "Backup creation failed"
        exit 1
    fi
}

# Handle script termination
trap 'log_error "Backup script interrupted"; exit 1' INT TERM

# Run main function
main "$@"