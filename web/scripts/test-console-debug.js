const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env.local' });

async function testConsole() {
  // First, we need to get a valid auth token
  // For testing, we'll use the Supabase service key to create a test session
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Testing with Supabase URL:', supabaseUrl);
  
  // Try to call the endpoint with a test user
  const testPayload = {
    command: 'wtaf create a simple test page',
    user_id: 'test-user-id', // This will fail auth check
    user_email: 'test@example.com'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/wtaf/web-console', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token' // This will fail
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConsole();