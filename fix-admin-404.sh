#!/bin/bash

echo "🔧 FIXING ADMIN 404 ERROR"
echo "========================"

cd /home/deploy/teer-betting-app

echo "📝 Checking backend logs for admin router error..."
docker logs teer_backend 2>&1 | grep -i "admin router" | tail -5

echo ""
echo "🔄 Restarting backend to fix admin router..."
docker-compose restart backend

echo "⏱️ Waiting for backend to start..."
sleep 10

echo "🧪 Testing admin endpoint..."
curl -s http://localhost:8001/api/v1/admin/dashboard 2>&1 | head -50

echo ""
echo "📊 Backend logs (recent):"
docker logs teer_backend 2>&1 | tail -10

echo ""
echo "✅ Fix attempted! Try accessing admin again."
echo "Admin URL: http://165.22.61.56:3000/admin"
