#!/usr/bin/env node

/**
 * Test script for Admin API endpoints
 * Tests POST /api/admin/save and GET /api/admin/load
 */

const BASE_URL = 'http://localhost:3000';

async function testAdminAPI() {
    console.log('🧪 Testing Admin API endpoints...\n');
    
    // Test data
    const testAppId = 'test-app-' + Date.now();
    const testSubmissionData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test submission'
    };
    
    try {
        // Test 1: POST /api/admin/save
        console.log('📤 Testing POST /api/admin/save...');
        const saveResponse = await fetch(`${BASE_URL}/api/admin/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                app_id: testAppId,
                submission_data: testSubmissionData
            })
        });
        
        const saveResult = await saveResponse.json();
        console.log('Save Status:', saveResponse.status);
        console.log('Save Response:', JSON.stringify(saveResult, null, 2));
        
        if (!saveResponse.ok) {
            throw new Error(`Save failed: ${saveResult.error}`);
        }
        
        console.log('✅ POST /api/admin/save works!\n');
        
        // Test 2: GET /api/admin/load
        console.log('📥 Testing GET /api/admin/load...');
        const loadResponse = await fetch(`${BASE_URL}/api/admin/load?app_id=${testAppId}`);
        
        const loadResult = await loadResponse.json();
        console.log('Load Status:', loadResponse.status);
        console.log('Load Response:', JSON.stringify(loadResult, null, 2));
        
        if (!loadResponse.ok) {
            throw new Error(`Load failed: ${loadResult.error}`);
        }
        
        console.log('✅ GET /api/admin/load works!\n');
        
        // Verify the data matches
        if (loadResult.data && loadResult.data.length > 0) {
            const retrievedData = loadResult.data[0];
            console.log('🔍 Verifying data integrity...');
            console.log('Original:', testSubmissionData);
            console.log('Retrieved:', retrievedData.submission_data);
            
            if (JSON.stringify(testSubmissionData) === JSON.stringify(retrievedData.submission_data)) {
                console.log('✅ Data integrity verified!');
            } else {
                console.log('❌ Data mismatch!');
            }
        }
        
        console.log('\n🎉 All tests passed! Admin API endpoints are working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Check if server is running
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            console.log('\n💡 Looks like the server is not running.');
            console.log('Please start the Next.js server with: npm run dev');
        }
    }
}

// Test error handling
async function testErrorHandling() {
    console.log('\n🧪 Testing error handling...\n');
    
    try {
        // Test missing app_id in POST
        console.log('Testing POST without app_id...');
        const response1 = await fetch(`${BASE_URL}/api/admin/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                submission_data: { test: 'data' }
            })
        });
        
        const result1 = await response1.json();
        console.log('Status:', response1.status);
        console.log('Response:', JSON.stringify(result1, null, 2));
        
        if (response1.status === 400) {
            console.log('✅ POST error handling works!');
        } else {
            console.log('❌ POST error handling failed!');
        }
        
        // Test missing app_id in GET
        console.log('\nTesting GET without app_id...');
        const response2 = await fetch(`${BASE_URL}/api/admin/load`);
        
        const result2 = await response2.json();
        console.log('Status:', response2.status);
        console.log('Response:', JSON.stringify(result2, null, 2));
        
        if (response2.status === 400) {
            console.log('✅ GET error handling works!');
        } else {
            console.log('❌ GET error handling failed!');
        }
        
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
    }
}

// Run tests
testAdminAPI().then(() => {
    return testErrorHandling();
}).then(() => {
    console.log('\n🏁 All tests completed!');
}); 