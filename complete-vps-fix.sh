#!/bin/bash

echo "🔧 COMPLETE VPS FIX - FINAL SOLUTION"
echo "=================================="

# Update frontend API configuration
echo "📝 Fixing frontend API configuration..."

# Fix API base URL in frontend
sed -i "s|const API_BASE_URL = '[^']*';|const API_BASE_URL = 'http://165.22.61.56:8001/api/v1';|g" frontend/src/services/api.js

# Fix any wallet methods calls to use correct endpoint
find frontend/src -name "*.js" -exec sed -i "s|/wallet/methods|/wallet/payment-methods/deposit|g" {} \;

# Fix any user/dashboard calls to use correct endpoint (change to wallet summary)
find frontend/src -name "*.js" -exec sed -i "s|/user/dashboard|/wallet/summary|g" {} \;

# Fix any balance calls
find frontend/src -name "*.js" -exec sed -i "s|/wallet/balance|/wallet|g" {} \;

echo "🏗️ Rebuilding frontend with fixed configuration..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "🏥 Checking backend health..."
sleep 5
curl -s http://localhost:8001/api/v1/docs > /dev/null && echo "✅ Backend API docs accessible" || echo "❌ Backend API docs not accessible"

echo "🧪 Testing API endpoints..."
echo "Testing wallet endpoints:"
curl -s http://localhost:8001/api/v1/wallet/payment-methods/deposit | head -50
echo ""

echo "📊 Checking container status..."
docker ps | grep teer

echo "🎉 Fix completed! Your app should now work at:"
echo "Frontend: http://165.22.61.56:3000"
echo "Backend API: http://165.22.61.56:8001/api/v1"
echo "API Docs: http://165.22.61.56:8001/api/v1/docs"
