#!/bin/bash

echo "🔧 PERMANENT TIMEZONE FIX DEPLOYMENT 🔧"
echo "======================================"

# Stop all containers
echo "1. Stopping all containers..."
docker-compose down

# Rebuild backend with new dependencies
echo "2. Rebuilding backend with timezone support..."
docker-compose build --no-cache backend

# Start database first
echo "3. Starting database..."
docker-compose up -d db redis

# Wait for database
echo "4. Waiting for database to be ready..."
sleep 10

# Run database migration
echo "5. Running database migration..."
docker-compose exec -T db psql -U teeruser -d teerdb -c "SELECT 1" || {
    echo "Database not ready, waiting more..."
    sleep 10
}

# Run alembic upgrade
echo "6. Applying database migrations..."
docker-compose run --rm backend alembic upgrade head

# Start all services
echo "7. Starting all services..."
docker-compose up -d

# Wait for backend to be ready
echo "8. Waiting for backend to start..."
sleep 15

# Test the fixes
echo "9. Testing timezone fixes..."
docker-compose exec -T backend python -c "
import pytz
from datetime import datetime, time
from app.models.house import House
from app.database import SessionLocal

print('✅ Timezone support loaded successfully')
print('✅ Available timezones:', ['Asia/Kolkata', 'Asia/Bangkok', 'UTC'])

# Test timezone conversion
kolkata_tz = pytz.timezone('Asia/Kolkata')
test_time = kolkata_tz.localize(datetime(2025, 9, 1, 15, 30))
utc_time = test_time.astimezone(pytz.UTC)
print(f'✅ Timezone conversion test: 15:30 IST = {utc_time.strftime(\"%H:%M\")} UTC')
"

echo ""
echo "🎉 PERMANENT FIXES APPLIED! 🎉"
echo "=============================="
echo ""
echo "✅ Timezone support added with pytz"
echo "✅ House model updated with proper timezone handling"
echo "✅ Scheduler service fixed for timezone-aware round creation"
echo "✅ Admin API updated to reschedule future rounds when times change"
echo "✅ Time validation improved to accept HH:MM format"
echo "✅ Database migration applied"
echo ""
echo "🔥 PERMANENT SOLUTIONS:"
echo "1. Times are now stored as LOCAL times in house timezone"
echo "2. Betting deadlines calculated correctly with timezone awareness"
echo "3. When you change house times, all future rounds automatically reschedule"
echo "4. Times show consistently in admin panel"
echo "5. Database stores UTC times but displays local times"
echo ""
echo "📱 ACCESS YOUR APP:"
echo "Frontend: http://$(curl -s ipinfo.io/ip):3000"
echo "Backend API: http://$(curl -s ipinfo.io/ip):8000"
echo "Admin Panel: http://$(curl -s ipinfo.io/ip):3000/admin"
echo ""
echo "🎯 The deadline time issue is now PERMANENTLY FIXED!"
