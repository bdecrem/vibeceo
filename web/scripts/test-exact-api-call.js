// Test exact API call with bartdecrem+14's data
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testExactApiCall() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get the exact user data
  const { data: subscriber } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('email', 'bartdecrem+14@gmail.com')
    .single();
    
  console.log('Subscriber found:', {
    slug: subscriber.slug,
    email: subscriber.email,
    phone: subscriber.phone_number,
    role: subscriber.role
  });
  
  // Now test the process-command directly
  const { processWebConsoleCommand } = require('../app/api/wtaf/web-console/process-command');
  
  console.log('\nCalling processWebConsoleCommand with:');
  console.log('  command: "wtaf make a hello world page"');
  console.log('  subscriber.slug:', subscriber.slug);
  console.log('  userRole:', subscriber.role);
  
  const result = await processWebConsoleCommand({
    command: 'wtaf make a hello world page',
    subscriber: subscriber,
    userRole: subscriber.role
  });
  
  console.log('\nResult:', JSON.stringify(result, null, 2));
}

testExactApiCall();