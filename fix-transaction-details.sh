#!/bin/bash

# Fix Transaction Details Display for Admin Panel
# This script fixes the issue where admin cannot see user-filled transaction details

set -e  # Exit on any error

echo "🔧 Fixing transaction details display in admin panel..."

# Navigate to project directory
cd /workspaces/teer-betting-app

echo "📦 Building and deploying backend changes..."

# Rebuild backend with updated schemas and API
docker-compose build backend

echo "🔄 Restarting backend service..."
docker-compose restart backend

echo "📦 Building and deploying frontend changes..."

# Rebuild frontend with updated admin wallet management
docker-compose build frontend

echo "🔄 Restarting frontend service..."
docker-compose restart frontend

echo "⏳ Waiting for services to start..."
sleep 10

echo "🏥 Checking service health..."

# Check backend health
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose logs backend --tail=20
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend check failed"
    docker-compose logs frontend --tail=20
    exit 1
fi

echo ""
echo "🎉 Transaction details fix deployed successfully!"
echo ""
echo "✨ Changes applied:"
echo "   📋 Backend schemas now include transaction_details field"
echo "   🔧 Admin API now returns user-filled transaction information"
echo "   🎨 Admin panel now displays UPI ID, bank details, user notes, etc."
echo "   📊 Improved table layout with dedicated Payment Details column"
echo ""
echo "🔗 Admin panel: http://localhost:3000/admin/wallet"
echo ""
echo "📝 Admin should now see:"
echo "   • UPI ID (for UPI transactions)"
echo "   • Bank account details (for bank transfers)"
echo "   • Reference IDs from user screenshots"
echo "   • User notes and comments"
echo "   • Screenshot links (if provided)"
echo ""
