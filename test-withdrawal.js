// Simple withdrawal test - check what the backend actually wants

// Test the withdrawal API directly
const testWithdrawal = async () => {
  try {
    // Minimal withdrawal request
    const testData = {
      amount: 100,
      payment_method_id: 1,
      transaction_details: {
        account_holder_name: "Test User",
        account_number: "1234567890",
        ifsc_code: "SBIN0001234"
      }
    };
    
    console.log('Testing withdrawal with minimal data:', testData);
    
    const response = await fetch('/api/v1/wallet/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Withdrawal test failed:', response.status, errorData);
    } else {
      const result = await response.json();
      console.log('Withdrawal test success:', result);
    }
  } catch (error) {
    console.error('Withdrawal test error:', error);
  }
};

// Run the test
testWithdrawal();
