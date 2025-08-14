const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWebConsoleAPI() {
  console.log('Testing web console API...\n');
  
  // Use service key to directly query user and simulate auth
  const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);
  
  // Get the user details
  const { data: userData, error: userError } = await serviceSupabase
    .from('wtaf_users')
    .select('*')
    .eq('email', 'bartdecrem+15@gmail.com')
    .single();
  
  if (userError || !userData) {
    console.error('Could not find user:', userError);
    return;
  }
  
  console.log('✅ Found user:', userData.email, 'Role:', userData.role);
  
  // Create a mock token (for testing purposes)
  const token = 'test-token-' + Date.now();
  
  // Test the web console API directly, simulating being logged in
  console.log('\nSending WTAF command: "wtaf make me a test page"');
  const response = await fetch('http://localhost:3000/api/wtaf/web-console', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-test-user-id': userData.id,  // Pass user ID in header for testing
      'x-test-mode': 'true'
    },
    body: JSON.stringify({
      command: 'wtaf make me a test page',
      user_email: userData.email,
      user_id: userData.id
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error('❌ Web console API error:', response.status);
    console.error('Error:', result);
  } else {
    console.log('✅ Web console API responded successfully');
    console.log('Result:', result);
  }
}

testWebConsoleAPI();