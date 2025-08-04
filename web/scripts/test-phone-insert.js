const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmlzZW9jY3p0dHJmd3RwYmRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg4MjkyMiwiZXhwIjoyMDY0NDU4OTIyfQ.L_NM27cVyq2uGNjtfzffRylBd5zEVOSxupqbYGVQwlc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing pending record insert...\n');
  
  const testPhone = '+15559876543';
  const verificationCode = '123456';
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  // Try to insert a pending record
  const { data, error } = await supabase
    .from('sms_subscribers')
    .insert({
      phone_number: testPhone,
      supabase_id: null,
      email: null,
      role: 'user',
      verification_code: verificationCode,
      verification_expires: expiresAt.toISOString(),
      confirmed: false,
      consent_given: false,
      slug: `pending-test-${Date.now()}`,
      created_at: new Date().toISOString()
    })
    .select();
    
  if (error) {
    console.error('INSERT FAILED:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('INSERT SUCCEEDED:', data);
  }
  
  // Clean up test record if it worked
  if (data && data[0]) {
    await supabase
      .from('sms_subscribers')
      .delete()
      .eq('id', data[0].id);
    console.log('\nTest record cleaned up');
  }
}

testInsert().catch(console.error);