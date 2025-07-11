const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAdminTokenFix() {
    console.log('🧪 Testing Admin Token Fix...\n');
    
    // Simulate the fixed flow where admin token is provided
    const adminToken = 'test-admin-token-123';
    
    try {
        // Step 1: Submit form with admin token (new behavior)
        console.log('📤 Testing form submission with admin token...');
        const submitResponse = await fetch(`${BASE_URL}/api/form/submit`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                formData: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '+1234567890'
                },
                adminToken: adminToken  // This is the key fix
            })
        });
        
        const submitResult = await submitResponse.json();
        console.log('✅ Submit Response:', JSON.stringify(submitResult, null, 2));
        
        if (submitResult.success) {
            // Step 2: Try to load admin page with the same token
            console.log('\n📥 Testing admin loading with same token...');
            const adminResponse = await fetch(`${BASE_URL}/api/form/submissions?token=${adminToken}`);
            const adminResult = await adminResponse.json();
            console.log('✅ Admin Response:', JSON.stringify(adminResult, null, 2));
            
            if (adminResult.submissions && adminResult.submissions.length > 0) {
                console.log('\n🎯 SUCCESS: Admin token fix working!');
                console.log('✅ Form submission used provided token');
                console.log('✅ Admin page found submission with same token');
                console.log('✅ No more token mismatch issues');
                
                // Verify the token in the submission matches
                const storedToken = adminResult.submissions[0].submission_data._admin_token;
                if (storedToken === adminToken) {
                    console.log('✅ Token verification: MATCH');
                } else {
                    console.log('❌ Token verification: MISMATCH');
                    console.log(`   Expected: ${adminToken}`);
                    console.log(`   Got: ${storedToken}`);
                }
            } else {
                console.log('\n❌ Admin page still not finding submissions');
            }
        } else {
            console.log('\n❌ Form submission failed:', submitResult);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection refused - make sure Next.js server is running on localhost:3000');
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

testAdminTokenFix(); 