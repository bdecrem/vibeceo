const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

// Create client with anon key (like the frontend does)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔍 Testing Supabase Auth...');
  console.log('URL:', supabaseUrl);
  console.log('Using anon key:', supabaseAnonKey.substring(0, 20) + '...');

  // Test 1: Try to sign up a test user
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('\n📝 Test 1: Attempting signup with:', testEmail);
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (signupError) {
    console.error('❌ Signup failed:', signupError.message);
    console.error('Full error:', signupError);
  } else {
    console.log('✅ Signup successful!');
    console.log('User ID:', signupData.user?.id);
    console.log('Session:', signupData.session ? 'Created' : 'Not created (email confirmation required)');
  }

  // Test 2: Try to sign in with wrong credentials
  console.log('\n🔐 Test 2: Testing signin with invalid credentials');
  const { error: signinError } = await supabase.auth.signInWithPassword({
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  });

  if (signinError) {
    console.log('✅ Expected error for invalid credentials:', signinError.message);
  } else {
    console.log('❌ Unexpected: signin succeeded with invalid credentials');
  }

  // Test 3: Check if we can get session
  console.log('\n🔍 Test 3: Checking session status');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session check failed:', sessionError);
  } else {
    console.log('✅ Session check successful');
    console.log('Current session:', session ? 'Active' : 'None');
  }

  // Test 4: Test password reset
  console.log('\n📧 Test 4: Testing password reset email');
  const { error: resetError } = await supabase.auth.resetPasswordForEmail('test@example.com', {
    redirectTo: 'http://localhost:3000/reset-password',
  });

  if (resetError) {
    console.error('❌ Password reset failed:', resetError.message);
  } else {
    console.log('✅ Password reset email request sent (no actual email if user doesn\'t exist)');
  }

  console.log('\n✨ Auth tests complete!');
}

testAuth().catch(console.error);