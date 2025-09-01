#!/bin/bash

echo "🔥 VPS FINAL FIX - STOPPING THE API ERROR"

cd /home/deploy/teer-betting-app

# Pull latest fixes
git pull origin main

# Force rebuild frontend with new .env file
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d

echo "✅ DONE! API error should be gone!"
echo "🌐 Check: http://165.22.61.56:3000"
