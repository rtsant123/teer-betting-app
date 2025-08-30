#!/bin/bash

# Enhanced wait-for-database script with robust error handling
set -e

# Database connection parameters
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-teer_betting}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_INTERVAL="${SLEEP_INTERVAL:-2}"

echo "🔄 Waiting for database at $DB_HOST:$DB_PORT..."
echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "⏱️  Max attempts: $MAX_ATTEMPTS (${MAX_ATTEMPTS}x${SLEEP_INTERVAL}s = $((MAX_ATTEMPTS * SLEEP_INTERVAL))s timeout)"

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo "🔍 Attempt $attempt/$MAX_ATTEMPTS: Testing database connection..."
    
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    else
        if [ $attempt -eq $MAX_ATTEMPTS ]; then
            echo "❌ Database failed to become available after $MAX_ATTEMPTS attempts"
            echo "🔧 Troubleshooting tips:"
            echo "   - Check if database container is running"
            echo "   - Verify database credentials"
            echo "   - Check network connectivity"
            exit 1
        fi
        
        echo "⏳ Database not ready yet (attempt $attempt/$MAX_ATTEMPTS). Waiting ${SLEEP_INTERVAL}s..."
        sleep $SLEEP_INTERVAL
        attempt=$((attempt + 1))
    fi
done

echo "🗃️  Initializing database..."
python init_db_robust.py

echo "🔄 Running database migrations..."
alembic upgrade head

echo "🚀 Starting application..."
if [ "$DEBUG" = "True" ]; then
    echo "🐛 Starting in DEBUG mode with auto-reload..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
else
    echo "🏭 Starting in PRODUCTION mode..."
    gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 100
fi
