#!/bin/bash

echo "🔥 FINAL FIX FOR API ISSUE - NO MORE BULLSHIT"

# Commit the simple fix
git add frontend/.env frontend/src/services/api.js
git commit -m "FINAL FIX: Hardcode API URL to stop VITE_API_URL undefined error"
git push origin main

echo ""
echo "🚀 NOW SSH TO VPS AND RUN:"
echo "curl -s https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/final-vps-fix.sh | bash"
echo ""
echo "OR MANUALLY:"
echo "cd /home/deploy/teer-betting-app"
echo "git pull origin main"
echo "docker-compose down"
echo "docker-compose build frontend"
echo "docker-compose up -d"
