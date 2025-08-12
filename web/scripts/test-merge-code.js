const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMergeCode() {
  console.log('🔍 Testing merge code format...');

  // Find a test user
  const { data: users, error: fetchError } = await supabase
    .from('sms_subscribers')
    .select('id, slug, phone_number')
    .limit(2);

  if (fetchError || users.length < 2) {
    console.error('❌ Need at least 2 users to test');
    return;
  }

  const user1 = users[0];
  const user2 = users[1];
  
  // Test the merge code format that's failing
  const verificationCode = '654321';
  const mergeCode = `M:${user2.id}:${verificationCode}`;
  
  console.log('\n📝 Testing merge code format...');
  console.log('User 1 ID:', user1.id);
  console.log('User 2 ID:', user2.id);
  console.log('Merge code:', mergeCode);
  console.log('Merge code length:', mergeCode.length);

  // Try to update with merge code
  const { data, error: updateError } = await supabase
    .from('sms_subscribers')
    .update({
      verification_code: mergeCode,
      verification_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      pending_phone_number: '+15559999999'
    })
    .eq('id', user1.id)
    .select();

  if (updateError) {
    console.error('❌ Update with merge code failed:', updateError);
    console.error('Error details:', {
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint
    });
  } else {
    console.log('✅ Update with merge code successful!');
    console.log('Stored verification_code:', data[0].verification_code);
    
    // Clean up
    await supabase
      .from('sms_subscribers')
      .update({
        verification_code: null,
        verification_expires: null,
        pending_phone_number: null
      })
      .eq('id', user1.id);
    console.log('✅ Cleaned up test data');
  }

  console.log('\n✨ Test complete!');
}

testMergeCode().catch(console.error);