const https = require('https');
const http = require('http');
const { URL } = require('url');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const req = protocol.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.abort();
            reject(new Error('Request timeout'));
        });
    });
}

async function testEndpoints() {
    console.log('🧪 Testing Teer Betting App API Endpoints...\n');

    const BASE_URL = 'http://localhost:8001/api/v1';

    const tests = [
        {
            name: 'Health Check',
            url: 'http://localhost:8001/health'
        },
        {
            name: 'Active Rounds',
            url: `${BASE_URL}/rounds/active`
        },
        {
            name: 'Active Banners',
            url: `${BASE_URL}/banners/active`
        },
        {
            name: 'Houses with Rounds',
            url: `${BASE_URL}/bet/houses-with-rounds`
        },
        {
            name: 'Results Display',
            url: `${BASE_URL}/rounds/results-display?limit=5`
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
            const response = await makeRequest(test.url);

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
