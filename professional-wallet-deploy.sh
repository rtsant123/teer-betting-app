#!/bin/bash

echo "🚀 PROFESSIONAL WALLET REDESIGN"
echo "==============================="

cd /home/deploy/teer-betting-app

echo "📥 Pulling latest changes..."
git pull

echo "🔄 Replacing wallet with clean professional version..."

# Backup current wallet
cp frontend/src/pages/Wallet.jsx frontend/src/pages/Wallet.jsx.backup

# Replace with clean version
cp frontend/src/pages/WalletClean.jsx frontend/src/pages/Wallet.jsx

echo "✅ Professional wallet implemented!"

echo "🎨 Adding professional CSS..."

# Add professional CSS
cat >> frontend/src/index.css << 'EOF'

/* Professional Wallet Styles */
.wallet-balance-card {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
}

.wallet-action-button {
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.wallet-action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.wallet-form-card {
  border: 2px solid #e5e7eb;
  transition: border-color 0.3s ease;
}

.wallet-form-card:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.transaction-item {
  transition: all 0.2s ease;
}

.transaction-item:hover {
  background-color: #f8fafc;
  transform: translateX(4px);
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .wallet-container {
    padding: 12px;
  }
  
  .wallet-balance-text {
    font-size: 1.8rem;
  }
  
  .wallet-action-button {
    padding: 16px;
    font-size: 16px;
  }
  
  .wallet-form-input {
    font-size: 16px;
    padding: 12px;
    min-height: 48px;
  }
}

/* Form improvements */
.wallet-form-input:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  border-color: #3b82f6;
}

.wallet-submit-button {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  transition: all 0.3s ease;
}

.wallet-submit-button:hover {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-1px);
}

.wallet-withdraw-button {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.wallet-withdraw-button:hover {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
}

EOF

echo "🏗️ Building with professional design..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for deployment..."
sleep 10

echo "📊 Checking deployment..."
docker ps | grep frontend

echo ""
echo "🎉 PROFESSIONAL WALLET DEPLOYED!"
echo "================================"
echo ""
echo "✅ Features implemented:"
echo "   • Single clean Add Money button"
echo "   • Professional color scheme (Blue/Green/Orange)"
echo "   • Proper deposit form with admin approval"
echo "   • Proper withdraw form with admin approval"
echo "   • Mobile-friendly responsive design"
echo "   • Clean transaction history"
echo "   • Professional animations and shadows"
echo ""
echo "🌐 Test your new wallet at:"
echo "   http://165.22.61.56:3000/wallet"
echo ""
echo "💼 Admin workflow:"
echo "   • Users submit deposit/withdrawal requests"
echo "   • Admin reviews and approves/rejects"
echo "   • Professional UI for both processes"
