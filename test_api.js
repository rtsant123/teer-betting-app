// Simple test script to check the API response
async function testTicketsAPI() {
    try {
        // First, let's check if we can access the API without authentication
        const response = await fetch('http://localhost:8001/api/v1/bet/my-tickets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // We need to get a valid token first
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.status === 401) {
            console.log('Need authentication token');
            return;
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data && data.length > 0) {
            console.log('First ticket:', data[0]);
            console.log('Total amount:', data[0].total_amount);
            console.log('Total potential payout:', data[0].total_potential_payout);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
testTicketsAPI();
