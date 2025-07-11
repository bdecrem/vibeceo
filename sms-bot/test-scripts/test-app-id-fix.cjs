const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAppIdFix() {
    console.log('🧪 Testing APP_ID Fix...\n');
    
    // Simulate what happens when a WTAF app is generated
    const adminToken = 'test-admin-token-456';
    const appUuid = 'a1b2c3d4-5678-90ef-1234-567890abcdef'; // Simulated WTAF app UUID
    
    try {
        // Step 1: Submit form with specific app_id (new behavior)
        console.log('📤 Testing form submission with app_id...');
        const submitResponse = await fetch(`${BASE_URL}/api/form/submit`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                formData: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '+1234567890'
                },
                adminToken: adminToken,
                app_id: appUuid  // This is the key fix - specific app UUID
            })
        });
        
        const submitResult = await submitResponse.json();
        console.log('✅ Submit Response:', JSON.stringify(submitResult, null, 2));
        
        if (submitResult.success) {
            // Step 2: Test data isolation - load with app_id filter
            console.log('\n📥 Testing admin loading with app_id filter...');
            const adminResponse = await fetch(`${BASE_URL}/api/form/submissions?token=${adminToken}&app_id=${appUuid}`);
            const adminResult = await adminResponse.json();
            console.log('✅ Admin Response (with app_id):', JSON.stringify(adminResult, null, 2));
            
            // Step 3: Test that we don't see submissions from other apps
            console.log('\n🔒 Testing data isolation - different app_id...');
            const otherAppUuid = 'different-app-uuid-123';
            const isolationResponse = await fetch(`${BASE_URL}/api/form/submissions?token=${adminToken}&app_id=${otherAppUuid}`);
            const isolationResult = await isolationResponse.json();
            console.log('✅ Isolation Response (different app_id):', JSON.stringify(isolationResult, null, 2));
            
            // Step 4: Test backwards compatibility - no app_id filter
            console.log('\n🔄 Testing backwards compatibility - no app_id...');
            const backwardsResponse = await fetch(`${BASE_URL}/api/form/submissions?token=${adminToken}`);
            const backwardsResult = await backwardsResponse.json();
            console.log('✅ Backwards Response (no app_id):', JSON.stringify(backwardsResult, null, 2));
            
            // Verify results
            if (adminResult.submissions && adminResult.submissions.length > 0) {
                const submission = adminResult.submissions[0];
                console.log('\n🎯 VERIFICATION RESULTS:');
                
                if (submission.app_id === appUuid) {
                    console.log('✅ APP_ID Fix: WORKING');
                    console.log(`   Stored app_id: ${submission.app_id}`);
                    console.log('   ✅ Uses specific app UUID instead of "form-api"');
                } else {
                    console.log('❌ APP_ID Fix: BROKEN');
                    console.log(`   Expected: ${appUuid}`);
                    console.log(`   Got: ${submission.app_id}`);
                }
                
                if (isolationResult.error || (isolationResult.submissions && isolationResult.submissions.length === 0)) {
                    console.log('✅ Data Isolation: WORKING');
                    console.log('   ✅ Different app_id returns no results (or error)');
                } else {
                    console.log('❌ Data Isolation: BROKEN');
                    console.log('   ❌ Different app_id still returns data');
                }
                
                if (backwardsResult.submissions.length > 0) {
                    console.log('✅ Backwards Compatibility: WORKING');
                    console.log('   ✅ No app_id filter still returns results');
                } else {
                    console.log('❌ Backwards Compatibility: BROKEN');
                    console.log('   ❌ No app_id filter returns no results');
                }
                
            } else {
                console.log('\n❌ No submissions found with app_id filter');
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

testAppIdFix(); 