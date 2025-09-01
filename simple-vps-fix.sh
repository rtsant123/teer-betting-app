#!/bin/bash

echo "🔧 COMPREHENSIVE VPS FIX - Fixing everything..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull

# Stop all containers completely
echo "🛑 Stopping all containers..."
docker-compose down --remove-orphans
docker system prune -f

# Check if port 8000 is in use and kill it
echo "🔍 Checking for processes using port 8000..."
sudo lsof -ti:8000 | xargs sudo kill -9 2>/dev/null || true

# Rebuild everything from scratch
echo "🔨 Rebuilding all containers (no cache)..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 20

# Check backend health
echo "🏥 Checking backend health..."
curl -f http://localhost:8000/docs || echo "❌ Backend not responding"

# Show status
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🌐 URLs:"
echo "Frontend: http://165.22.61.56:3000"
echo "Backend:  http://165.22.61.56:8000"
echo "API Docs: http://165.22.61.56:8000/docs"

# Show logs if backend fails
echo ""
echo "📋 Recent backend logs:"
docker-compose logs --tail=10 backend
