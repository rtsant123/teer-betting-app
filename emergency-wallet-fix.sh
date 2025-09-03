#!/bin/bash

echo "🔧 EMERGENCY WALLET SYNTAX FIX"
echo "============================="

cd /home/deploy/teer-betting-app

echo "📝 Pulling latest changes..."
git pull

echo "🔧 Fixing Wallet.jsx syntax error..."

# Reset the wallet file to a clean state from git
git checkout HEAD -- frontend/src/pages/Wallet.jsx

echo "📱 Applying mobile CSS improvements to index.css..."

# Ensure mobile CSS is added
grep -q "Mobile-friendly wallet styles" frontend/src/index.css || cat >> frontend/src/index.css << 'EOF'

/* Mobile-friendly wallet styles */
@media (max-width: 640px) {
  .mobile-form-button {
    padding: 16px !important;
    font-size: 16px !important;
    min-height: 48px !important;
    touch-action: manipulation;
  }
  
  .wallet-card {
    margin: 8px !important;
    padding: 16px !important;
  }
  
  .payment-method-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  
  .form-input-mobile {
    font-size: 16px !important;
    padding: 12px !important;
    min-height: 44px !important;
  }
}

/* Prevent zoom on iOS */
input[type="number"], 
input[type="text"], 
textarea {
  font-size: 16px;
}
EOF

echo "🏗️ Building frontend with clean syntax..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for frontend..."
sleep 10

echo "📊 Container status:"
docker ps | grep frontend

echo ""
echo "✅ Emergency fix applied - wallet should work now!"
echo "Test at: http://165.22.61.56:3000/wallet"
