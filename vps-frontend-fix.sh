#!/bin/bash

echo "🔧 VPS: Fixing API connection and rebuilding frontend..."

# Go to app directory
cd /home/deploy/teer-betting-app

# Pull latest changes
git pull origin main

# Rebuild frontend with new API config
docker-compose build frontend

# Restart all services
docker-compose down
docker-compose up -d

# Wait for services
sleep 20

# Check status
docker-compose ps

echo "✅ Frontend rebuilt with new API configuration!"
echo "🌐 Test your app at: http://165.22.61.56:3000"
