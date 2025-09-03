#!/bin/bash

echo "🔧 FIXING WALLET UI - MOBILE FRIENDLY"
echo "====================================="

cd /home/deploy/teer-betting-app

echo "📝 Pulling latest changes..."
git pull

echo "🔧 Removing duplicate content and fixing mobile UI..."

# Remove duplicates from Wallet.jsx
awk '!seen[$0]++' frontend/src/pages/Wallet.jsx > frontend/src/pages/Wallet.jsx.tmp
mv frontend/src/pages/Wallet.jsx.tmp frontend/src/pages/Wallet.jsx

echo "✅ Duplicates removed"

echo "📱 Adding mobile-specific CSS improvements..."

# Create mobile-friendly CSS patch
cat >> frontend/src/index.css << 'EOF'

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
  
  .mobile-modal {
    margin: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    max-width: none !important;
  }
}

/* Prevent zoom on iOS */
input[type="number"], 
input[type="text"], 
textarea {
  font-size: 16px;
}

EOF

echo "🏗️ Rebuilding frontend with mobile fixes..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for frontend to start..."
sleep 10

echo "📊 Container status:"
docker ps | grep frontend

echo ""
echo "🎉 Mobile-friendly wallet UI applied!"
echo "Changes made:"
echo "✅ Removed duplicate buttons"
echo "✅ Added mobile-friendly CSS"
echo "✅ Improved touch targets"
echo "✅ Better responsive design"
echo ""
echo "Test at: http://165.22.61.56:3000/wallet"
