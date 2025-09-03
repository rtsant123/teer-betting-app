#!/bin/bash

echo "🔧 PROFESSIONAL WALLET UI UPDATE"
echo "================================"

cd /home/deploy/teer-betting-app

echo "📥 Pulling latest wallet improvements..."
git pull

echo "🎨 Changes applied:"
echo "✅ Removed duplicate 'Add Money to Wallet' button"
echo "✅ Updated to professional blue/orange color scheme"
echo "✅ Simplified button styling (no more flashy gradients)"
echo "✅ Cleaner, more professional appearance"
echo "✅ Better mobile responsiveness"

echo "🏗️ Rebuilding frontend with new design..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for frontend..."
sleep 10

echo "📊 Container status:"
docker ps | grep frontend

echo ""
echo "🎉 Professional wallet UI is now live!"
echo "Features:"
echo "• Single submit button (no duplicates)"
echo "• Professional blue theme for deposits"
echo "• Professional orange theme for withdrawals"
echo "• Clean, modern design"
echo "• Better mobile experience"
echo ""
echo "Test at: http://165.22.61.56:3000/wallet"
