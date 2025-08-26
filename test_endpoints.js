const axios = require('axios');

const BASE_URL = 'http://localhost:8001/api/v1';

async function testEndpoints() {
    console.log('🧪 Testing Teer Betting App API Endpoints...\n');

    const tests = [
        {
            name: 'Health Check',
            method: 'GET',
            url: 'http://localhost:8001/health',
            expectAuth: false
        },
        {
            name: 'Active Rounds',
            method: 'GET',
            url: `${BASE_URL}/rounds/active`,
            expectAuth: false
        },
        {
            name: 'Active Banners',
            method: 'GET',
            url: `${BASE_URL}/banners/active`,
            expectAuth: false
        },
        {
            name: 'Houses with Rounds',
            method: 'GET',
            url: `${BASE_URL}/bet/houses-with-rounds`,
            expectAuth: false
        },
        {
            name: 'Results Display',
            method: 'GET',
            url: `${BASE_URL}/rounds/results-display?limit=5`,
            expectAuth: false
        }
    ];

    const results = {
        passed: 0,
        failed: 0,
        total: tests.length
    };

    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name}...`);
            const response = await axios({
                method: test.method,
                url: test.url,
                timeout: 5000,
                validateStatus: () => true // Don't throw on any status
            });

            if (response.status === 200) {
                console.log(`✅ ${test.name}: PASSED (${response.status})`);
                results.passed++;
            } else {
                console.log(`❌ ${test.name}: FAILED (${response.status})`);
                results.failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            results.failed++;
        }
    }

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${results.passed}/${results.total}`);
    console.log(`❌ Failed: ${results.failed}/${results.total}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

    if (results.passed === results.total) {
        console.log('\n🎉 ALL TESTS PASSED! System is ready for deployment.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the issues before deployment.');
    }
}

testEndpoints().catch(console.error);
