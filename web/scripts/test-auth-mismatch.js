// Test if auth user ID matches sms_subscribers supabase_id
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testAuthMismatch() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  // Create client with anon key (like frontend does)
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in as the test user
  console.log('STEP 1: Signing in as bartdecrem+14@gmail.com...');
  
  const { data: authData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: 'bartdecrem+14@gmail.com',
    password: 'test123' // You'll need to provide the actual password
  });
  
  if (signInError) {
    console.log('Sign in failed:', signInError.message);
    console.log('Trying to get user by email from auth.users table directly...');
    
    // Use service key to check auth.users directly
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: authUsers, error: authError } = await supabaseService
      .from('auth.users')
      .select('id, email')
      .ilike('email', 'bartdecrem+14@gmail.com');
      
    if (authUsers && authUsers.length > 0) {
      const authUser = authUsers[0];
      console.log('\nAuth user in database:');
      console.log('  ID:', authUser.id);
      console.log('  Email:', authUser.email);
      
      // Now check sms_subscribers
      const { data: subscriber, error: subError } = await supabaseService
        .from('sms_subscribers')
        .select('supabase_id, email, slug')
        .eq('email', 'bartdecrem+14@gmail.com')
        .single();
        
      if (subscriber) {
        console.log('\nSMS subscriber:');
        console.log('  supabase_id:', subscriber.supabase_id);
        console.log('  email:', subscriber.email);
        console.log('  slug:', subscriber.slug);
        
        console.log('\n⚠️  MISMATCH CHECK:');
        if (authUser.id !== subscriber.supabase_id) {
          console.log('❌ AUTH USER ID DOES NOT MATCH SMS SUBSCRIBER SUPABASE_ID!');
          console.log('   Auth ID:', authUser.id);
          console.log('   SMS ID:', subscriber.supabase_id);
          console.log('\nTHIS IS THE PROBLEM! The IDs don\'t match!');
        } else {
          console.log('✅ IDs match');
        }
      }
    }
  } else {
    console.log('Signed in successfully!');
    console.log('User ID from auth:', authData.user.id);
    console.log('User email from auth:', authData.user.email);
  }
}

testAuthMismatch();