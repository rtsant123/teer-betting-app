#!/bin/bash

echo "🔧 FIXING WALLET API CONNECTION..."

# Commit the API fix
git add frontend/src/services/api.js
git commit -m "Fix frontend API connection issue (VITE_API_URL undefined)"
git push origin main

echo "✅ API fix committed. Now deploy to VPS:"
echo ""
echo "🚀 RUN THIS ON YOUR VPS:"
echo "cd /home/deploy/teer-betting-app"
echo "git pull origin main"
echo "docker-compose restart frontend"
echo ""
echo "🎯 FIXED ISSUES:"
echo "• ✅ Frontend API connection (VITE_API_URL undefined error)"
echo "• ✅ Your existing wallet system will now work properly"
echo "• ✅ Deposit and withdraw requests already implemented"
echo ""
echo "💡 NO NEW FILES CREATED - Just fixed existing ones!"
