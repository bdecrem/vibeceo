const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedLink() {
  console.log('🔍 Testing fixed link implementation...');

  // Find a test user with placeholder phone
  const { data: users, error: fetchError } = await supabase
    .from('sms_subscribers')
    .select('id, slug, phone_number, supabase_id')
    .or('phone_number.like.+1555%,phone_number.is.null')
    .limit(1);

  if (fetchError || users.length === 0) {
    console.error('❌ No test user found with placeholder phone');
    return;
  }

  const testUser = users[0];
  console.log('\n📝 Testing with user:', testUser.slug || 'no-slug', '(ID:', testUser.id, ')');
  console.log('Current phone:', testUser.phone_number);
  
  // Simulate storing verification for merge case
  const verificationCode = '654321'; // 6 digits
  const pendingPhone = '+16461234567'; // Normal phone number
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  console.log('\n📝 Testing verification storage (merge case)...');
  console.log('Verification code (6 chars):', verificationCode);
  console.log('Pending phone:', pendingPhone);

  const { data, error: updateError } = await supabase
    .from('sms_subscribers')
    .update({
      verification_code: verificationCode,
      verification_expires: expires,
      pending_phone_number: pendingPhone
    })
    .eq('id', testUser.id)
    .select();

  if (updateError) {
    console.error('❌ Update failed:', updateError);
  } else {
    console.log('✅ Update successful!');
    console.log('Stored verification_code:', data[0].verification_code);
    console.log('Stored pending_phone_number:', data[0].pending_phone_number);
    
    // Test checking if this is a merge
    console.log('\n📊 Testing merge detection...');
    const { data: existingPhone } = await supabase
      .from('sms_subscribers')
      .select('id, slug')
      .eq('phone_number', pendingPhone)
      .neq('id', testUser.id)
      .single();
    
    if (existingPhone) {
      console.log('✅ Would be detected as merge with user:', existingPhone.slug);
    } else {
      console.log('✅ Would be detected as new phone link (no existing user)');
    }
    
    // Clean up
    await supabase
      .from('sms_subscribers')
      .update({
        verification_code: null,
        verification_expires: null,
        pending_phone_number: null
      })
      .eq('id', testUser.id);
    console.log('\n✅ Cleaned up test data');
  }

  console.log('\n✨ Test complete!');
}

testFixedLink().catch(console.error);