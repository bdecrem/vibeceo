const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

// SECURITY: Use environment variables for sensitive keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_KEY not found in environment variables');
  console.error('Please add SUPABASE_SERVICE_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPhoneLinking() {
  console.log('=== DEBUGGING PHONE LINKING ===\n');
  
  // 1. Check all records with verification codes
  const { data: verificationRecords, error: err1 } = await supabase
    .from('sms_subscribers')
    .select('phone_number, slug, verification_code, verification_expires, created_at')
    .not('verification_code', 'is', null)
    .order('created_at', { ascending: false });
    
  console.log('Records with verification codes:');
  console.table(verificationRecords || []);
  
  // 2. Check pending records
  const { data: pendingRecords, error: err2 } = await supabase
    .from('sms_subscribers')
    .select('phone_number, slug, supabase_id, verification_code, created_at')
    .like('slug', 'pending-%')
    .order('created_at', { ascending: false });
    
  console.log('\nPending records:');
  console.table(pendingRecords || []);
  
  // 3. Check phone number formats
  const { data: phoneFormats, error: err3 } = await supabase
    .from('sms_subscribers')
    .select('phone_number')
    .not('phone_number', 'is', null)
    .limit(10);
    
  console.log('\nSample phone number formats:');
  phoneFormats?.forEach(r => {
    console.log(`  ${r.phone_number} (length: ${r.phone_number.length})`);
  });
  
  // 4. Test phone normalization
  console.log('\nPhone normalization test:');
  const testPhones = ['+1 (555) 123-4567', '555-123-4567', '15551234567', '+15551234567'];
  testPhones.forEach(phone => {
    const cleaned = phone.replace(/\D/g, '');
    const normalized = '+' + (cleaned.length === 10 ? '1' + cleaned : cleaned);
    console.log(`  "${phone}" -> "${normalized}"`);
  });
}

debugPhoneLinking().catch(console.error);