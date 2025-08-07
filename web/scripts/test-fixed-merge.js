const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedMerge() {
  console.log('🔍 Testing fixed merge code format...');

  // Find test users
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
  
  // Test the NEW format
  const verificationCode = '654321'; // 6 digits only
  const mergePendingPhone = `MERGE:${user2.id}:+15559999999`;
  
  console.log('\n📝 Testing NEW merge format...');
  console.log('User 1 ID:', user1.id);
  console.log('User 2 ID:', user2.id);
  console.log('Verification code (6 chars):', verificationCode);
  console.log('Pending phone (with merge info):', mergePendingPhone);
  console.log('Pending phone length:', mergePendingPhone.length);

  // Try to update with new format
  const { data, error: updateError } = await supabase
    .from('sms_subscribers')
    .update({
      verification_code: verificationCode,  // Just 6 digits
      verification_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      pending_phone_number: mergePendingPhone  // Merge info here
    })
    .eq('id', user1.id)
    .select();

  if (updateError) {
    console.error('❌ Update with new format failed:', updateError);
    console.error('Error details:', {
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint
    });
  } else {
    console.log('✅ Update with new format successful!');
    console.log('Stored verification_code:', data[0].verification_code);
    console.log('Stored pending_phone_number:', data[0].pending_phone_number);
    
    // Test parsing the merge info
    if (data[0].pending_phone_number.startsWith('MERGE:')) {
      const parts = data[0].pending_phone_number.split(':');
      console.log('\n📊 Parsed merge info:');
      console.log('  - Is merge:', true);
      console.log('  - Target ID:', parts[1]);
      console.log('  - Phone number:', parts[2]);
    }
    
    // Clean up
    await supabase
      .from('sms_subscribers')
      .update({
        verification_code: null,
        verification_expires: null,
        pending_phone_number: null
      })
      .eq('id', user1.id);
    console.log('\n✅ Cleaned up test data');
  }

  console.log('\n✨ Test complete!');
}

testFixedMerge().catch(console.error);