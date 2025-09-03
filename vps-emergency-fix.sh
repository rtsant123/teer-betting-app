#!/bin/bash

echo "🔧 VPS BACKEND EMERGENCY FIX"
echo "============================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found!"
    echo "Run this from your app directory: cd /home/deploy/teer-betting-app"
    exit 1
fi

echo "1. 🛑 Stopping all containers and cleaning up..."
docker-compose down --remove-orphans
docker system prune -f

echo "2. 🔍 Checking what's using port 8000..."
sudo netstat -tulpn | grep :8000 || echo "Port 8000 is free"

echo "3. 🔨 Rebuilding containers..."
docker-compose build --no-cache

echo "4. 🚀 Starting services..."
docker-compose up -d

echo "5. ⏳ Waiting 30 seconds for services to start..."
sleep 30

echo "6. 📊 Checking container status..."
docker-compose ps

echo "7. 🏥 Testing backend health..."
curl -f http://localhost:8000/docs > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend is responding!"
else
    echo "❌ Backend is not responding. Checking logs..."
    echo ""
    echo "📋 Backend logs:"
    docker-compose logs --tail=20 backend
    echo ""
    echo "📋 Database logs:"
    docker-compose logs --tail=10 db
fi

echo ""
echo "🌐 Your app URLs:"
echo "Frontend: http://165.22.61.56:3000"
echo "Backend:  http://165.22.61.56:8000"
echo "API Docs: http://165.22.61.56:8000/docs"
echo ""

echo "8. 🔍 Final connectivity test..."
curl -f http://165.22.61.56:8000/docs > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend is accessible from outside!"
else
    echo "❌ Backend is not accessible. Check firewall or port forwarding."
fi
