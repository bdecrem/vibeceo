const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testApiEndpoints() {
    console.log('🧪 Testing API Endpoints...\n');
    
    try {
        // Test form submission
        console.log('📤 Testing form submission...');
        const submitResponse = await fetch(`${BASE_URL}/api/form/submit`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                formData: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '+1234567890'
                }
            })
        });
        
        const submitResult = await submitResponse.json();
        console.log('✅ Submit Response:', JSON.stringify(submitResult, null, 2));
        
        if (submitResult.success && submitResult.adminUrl) {
            const adminToken = submitResult.adminUrl.split('token=')[1];
            console.log('🔑 Admin Token:', adminToken);
            
            // Test admin loading
            console.log('\n📥 Testing admin loading...');
            const adminResponse = await fetch(`${BASE_URL}/api/form/submissions?token=${adminToken}`);
            const adminResult = await adminResponse.json();
            console.log('✅ Admin Response:', JSON.stringify(adminResult, null, 2));
            
            if (adminResult.submissions && adminResult.submissions.length > 0) {
                console.log('\n🎯 SUCCESS: Both endpoints working correctly!');
                console.log(`📊 Found ${adminResult.submissions.length} submission(s)`);
            } else {
                console.log('\n⚠️ Admin endpoint working but no submissions found');
            }
        } else {
            console.log('\n❌ Submit failed:', submitResult);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection refused - make sure Next.js server is running on localhost:3000');
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

testApiEndpoints(); 