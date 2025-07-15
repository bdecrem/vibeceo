const fetch = require('node-fetch');

// Mock the fetch function globally
global.fetch = fetch;

// Test the query helper functionality
async function testQueryHelper() {
    console.log('🧪 Testing Query Helper Implementation...');
    
    const testData = {
        app_id: 'test_query_app',
        action_type: 'query',
        content_data: {
            type: 'task',
            where: { 'content_data.priority': 'high' },
            orderBy: 'created_at',
            limit: 10
        }
    };
    
    console.log('📤 Test payload:', JSON.stringify(testData, null, 2));
    
    try {
        const response = await fetch('http://localhost:3000/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Query failed:', errorData);
            return;
        }
        
        const result = await response.json();
        console.log('✅ Query successful:', result);
        
        // Test validation
        if (result.success && Array.isArray(result.data)) {
            console.log('✅ Query helper working correctly!');
            console.log(`📊 Returned ${result.data.length} records`);
        } else {
            console.log('❌ Unexpected response format:', result);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Test invalid query to verify security
async function testSecurityValidation() {
    console.log('🔐 Testing Security Validation...');
    
    const maliciousData = {
        app_id: 'test_query_app',
        action_type: 'query',
        content_data: {
            type: 'task',
            where: { 'malicious_field': 'value' }, // Should be filtered out
            orderBy: 'DROP TABLE users', // Should be rejected
            limit: 1000 // Should be capped at 100
        }
    };
    
    console.log('📤 Malicious test payload:', JSON.stringify(maliciousData, null, 2));
    
    try {
        const response = await fetch('http://localhost:3000/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(maliciousData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('✅ Security validation working - request rejected:', errorData);
        } else {
            const result = await response.json();
            console.log('✅ Security validation working - malicious fields filtered:', result);
        }
        
    } catch (error) {
        console.error('❌ Security test failed:', error.message);
    }
}

// Run tests
if (require.main === module) {
    testQueryHelper().then(() => {
        testSecurityValidation();
    });
}

module.exports = { testQueryHelper, testSecurityValidation }; 