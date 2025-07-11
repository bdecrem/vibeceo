const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on different port
const SUBMIT_URL = `${BASE_URL}/api/form/submit`;

async function testFormEndpoints() {
  console.log('🧪 Testing Form API Endpoints...\n');
  
  try {
    // Test 1: Submit form data
    console.log('📤 Testing form submission...');
    const submitResponse = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test submission',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const submitResult = await submitResponse.json();
    console.log('✅ Submit Response:', submitResult);
    
    if (!submitResult.success) {
      throw new Error('Form submission failed');
    }
    
    // Extract admin URL and token
    const adminUrl = submitResult.adminUrl;
    const token = adminUrl.split('token=')[1];
    console.log('🔑 Generated token:', token);
    
    // Test 2: Load submissions with token
    console.log('\n📥 Testing submissions retrieval...');
    const submissionsUrl = `${BASE_URL}/api/form/submissions?token=${token}`;
    
    const submissionsResponse = await fetch(submissionsUrl);
    const submissionsResult = await submissionsResponse.json();
    
    console.log('✅ Submissions Response:', JSON.stringify(submissionsResult, null, 2));
    
    if (!submissionsResult.submissions || submissionsResult.submissions.length === 0) {
      throw new Error('No submissions found');
    }
    
    // Test 3: Try with invalid token
    console.log('\n🚫 Testing invalid token...');
    const invalidResponse = await fetch(`${BASE_URL}/api/form/submissions?token=invalid-token`);
    const invalidResult = await invalidResponse.json();
    
    console.log('⚠️  Invalid token response:', invalidResult);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the tests
testFormEndpoints(); 