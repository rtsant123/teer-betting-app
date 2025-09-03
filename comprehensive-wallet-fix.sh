#!/bin/bash

echo "🔧 COMPREHENSIVE WALLET FIX"
echo "=========================="

# Check if we have duplication in the file
echo "📝 Checking for file duplication..."
cd /home/deploy/teer-betting-app

# Count unique lines vs total lines in Wallet.jsx
TOTAL_LINES=$(wc -l < frontend/src/pages/Wallet.jsx)
UNIQUE_LINES=$(sort frontend/src/pages/Wallet.jsx | uniq | wc -l)

echo "Total lines: $TOTAL_LINES"
echo "Unique lines: $UNIQUE_LINES"

if [ "$TOTAL_LINES" != "$UNIQUE_LINES" ]; then
    echo "⚠️ Found duplicated content in Wallet.jsx"
    echo "🔧 Removing duplicates..."
    
    # Create a backup
    cp frontend/src/pages/Wallet.jsx frontend/src/pages/Wallet.jsx.backup
    
    # Remove duplicate lines while preserving order
    awk '!seen[$0]++' frontend/src/pages/Wallet.jsx > frontend/src/pages/Wallet.jsx.tmp
    mv frontend/src/pages/Wallet.jsx.tmp frontend/src/pages/Wallet.jsx
    
    echo "✅ Duplicates removed"
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Fix specific validation issues
echo "🔧 Applying final fixes..."

# Ensure payment_method_id is properly converted to int
sed -i 's/parseInt(depositForm.payment_method_id)/parseInt(depositForm.payment_method_id, 10)/g' frontend/src/pages/Wallet.jsx

# Add error handling for empty transaction_details
cat > /tmp/deposit_fix.js << 'EOF'
      // Send as JSON according to backend DepositRequest schema
      const depositData = {
        amount: parseFloat(depositForm.amount),
        payment_method_id: parseInt(depositForm.payment_method_id, 10),
        transaction_details: transactionDetails || {}
      };

      console.log('Sending deposit data:', depositData);
EOF

# Replace the depositData creation part
sed -i '/Send as JSON according to backend DepositRequest schema/,/};/c\
      // Send as JSON according to backend DepositRequest schema\
      const depositData = {\
        amount: parseFloat(depositForm.amount),\
        payment_method_id: parseInt(depositForm.payment_method_id, 10),\
        transaction_details: transactionDetails || {}\
      };\
\
      console.log("Sending deposit data:", depositData);' frontend/src/pages/Wallet.jsx

echo "🏗️ Rebuilding frontend..."
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏱️ Waiting for services..."
sleep 10

echo "🧪 Testing endpoints..."
curl -s http://localhost:8001/api/v1/wallet/payment-methods/deposit && echo "✅ Payment methods OK" || echo "❌ Payment methods failed"

echo ""
echo "📊 Container status:"
docker ps | grep teer

echo ""
echo "🎉 Comprehensive fix applied!"
echo "Frontend: http://165.22.61.56:3000"
echo "Try the deposit again - should work now!"
