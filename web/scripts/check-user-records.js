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

async function checkUsers() {
  // Check records created recently (web signups)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24); // Last 24 hours
  
  const { data: recentUsers } = await supabase
    .from('sms_subscribers')
    .select('slug, email, phone_number, role, created_at, supabase_id')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });
    
  console.log('Recent user records (last 24 hours):');
  console.table(recentUsers || []);
  
  // Check if there are any users with email but no phone
  const { data: webOnlyUsers } = await supabase
    .from('sms_subscribers')
    .select('slug, email, phone_number, role')
    .not('email', 'is', null)
    .is('phone_number', null)
    .limit(5);
    
  console.log('\nWeb-only users (email but no phone):');
  console.table(webOnlyUsers || []);
}

checkUsers().catch(console.error);