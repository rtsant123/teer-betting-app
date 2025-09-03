#!/bin/bash

echo "🔧 FINAL DEPOSIT FIX"
echo "==================="

echo "📝 Updating code and rebuilding..."

# Pull latest changes
git pull

# Rebuild frontend with fixes
echo "🏗️ Rebuilding frontend..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for services to start..."
sleep 10

echo "🧪 Testing endpoints..."
echo "Backend health:"
curl -s http://localhost:8001/api/v1/health && echo "✅ Health OK" || echo "❌ Health failed"

echo ""
echo "Payment methods:"
curl -s http://localhost:8001/api/v1/wallet/payment-methods/deposit | head -100

echo ""
echo "📊 Container status:"
docker ps | grep teer

echo ""
echo "🎉 Fix applied! Try your deposit now."
echo "Frontend: http://165.22.61.56:3000"
echo "Backend: http://165.22.61.56:8001/api/v1"
