#!/bin/bash

# SIMPLE VPS FIX - Just rebuild and restart
echo "🔧 SIMPLE VPS FIX - Rebuilding frontend..."

# Pull latest changes
git pull

# Stop containers
docker-compose down

# Rebuild frontend only (no cache)
docker-compose build --no-cache frontend

# Start everything
docker-compose up -d

# Check status
echo "✅ Services restarted. Checking status..."
docker-compose ps

echo "🌐 Frontend should now work at: http://165.22.61.56:3000"
echo "🔧 Backend API at: http://165.22.61.56:8000"
