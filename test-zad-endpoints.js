const fetch = require('node-fetch');

async function testZadEndpoints() {
    console.log('🧪 Testing ZAD API endpoints...');
    
    // Test data
    const testData = {
        type: 'test_submission',
        data: {
            userLabel: 'test_user',
            passcode: 'test123',
            participantId: 'test_participant_' + Date.now(),
            message: 'Hello from test!',
            timestamp: Date.now()
        }
    };
    
    const baseUrl = 'http://localhost:3000'; // Adjust if different
    const testReferer = 'http://localhost:3000/bart/test-app'; // Simulate app URL
    
    try {
        // Test 1: POST /api/zad/save
        console.log('📤 Testing POST /api/zad/save...');
        const saveResponse = await fetch(`${baseUrl}/api/zad/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'referer': testReferer
            },
            body: JSON.stringify(testData)
        });
        
        const saveResult = await saveResponse.json();
        console.log('Status:', saveResponse.status);
        console.log('Response:', saveResult);
        
        if (saveResponse.status === 200 && saveResult.success) {
            console.log('✅ Save endpoint working!');
        } else {
            console.log('❌ Save endpoint failed:', saveResult);
            return;
        }
        
        console.log('');
        
        // Test 2: GET /api/zad/load
        console.log('📥 Testing GET /api/zad/load...');
        const loadResponse = await fetch(`${baseUrl}/api/zad/load?type=test_submission`, {
            headers: {
                'referer': testReferer
            }
        });
        
        const loadResult = await loadResponse.json();
        console.log('Status:', loadResponse.status);
        console.log('Response:', loadResult);
        
        if (loadResponse.status === 200 && loadResult.success) {
            console.log('✅ Load endpoint working!');
            console.log(`📊 Found ${loadResult.data.length} records`);
        } else {
            console.log('❌ Load endpoint failed:', loadResult);
        }
        
        console.log('\n🎉 ZAD endpoints test complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testZadEndpoints(); 