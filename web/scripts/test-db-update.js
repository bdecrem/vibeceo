const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

// Use service key like the API does
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseUpdate() {
  console.log('🔍 Testing Supabase database updates...');
  console.log('URL:', supabaseUrl);
  console.log('Using service key:', supabaseKey.substring(0, 20) + '...');

  // First, find a test user to work with
  console.log('\n📝 Finding a test user...');
  const { data: users, error: fetchError } = await supabase
    .from('sms_subscribers')
    .select('id, slug, phone_number, verification_code, verification_expires, pending_phone_number')
    .limit(5);

  if (fetchError) {
    console.error('❌ Failed to fetch users:', fetchError);
    return;
  }

  console.log(`✅ Found ${users.length} users`);
  
  if (users.length === 0) {
    console.log('No users to test with');
    return;
  }

  // Pick the first user for testing
  const testUser = users[0];
  console.log('\n🧪 Testing with user:', testUser.slug, '(ID:', testUser.id, ')');
  console.log('Current verification_code:', testUser.verification_code);
  console.log('Current verification_expires:', testUser.verification_expires);
  console.log('Current pending_phone_number:', testUser.pending_phone_number);

  // Try to update the verification fields
  const testCode = '123456';
  const testExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const testPhone = '+15551234567';
  
  console.log('\n📝 Attempting to update verification fields...');
  console.log('New code:', testCode);
  console.log('New expires:', testExpires);
  console.log('New pending phone:', testPhone);

  const { data: updateData, error: updateError } = await supabase
    .from('sms_subscribers')
    .update({
      verification_code: testCode,
      verification_expires: testExpires,
      pending_phone_number: testPhone
    })
    .eq('id', testUser.id)
    .select();

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    console.error('Error code:', updateError.code);
    console.error('Error message:', updateError.message);
    console.error('Error details:', updateError.details);
    console.error('Error hint:', updateError.hint);
  } else {
    console.log('✅ Update successful!');
    console.log('Updated record:', updateData);
  }

  // Clean up - restore original values
  console.log('\n🧹 Cleaning up - restoring original values...');
  const { error: cleanupError } = await supabase
    .from('sms_subscribers')
    .update({
      verification_code: testUser.verification_code,
      verification_expires: testUser.verification_expires,
      pending_phone_number: testUser.pending_phone_number
    })
    .eq('id', testUser.id);

  if (cleanupError) {
    console.error('⚠️ Cleanup failed:', cleanupError);
  } else {
    console.log('✅ Cleanup successful');
  }

  console.log('\n✨ Test complete!');
}

testDatabaseUpdate().catch(console.error);