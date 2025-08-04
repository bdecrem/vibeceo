const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmlzZW9jY3p0dHJmd3RwYmRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg4MjkyMiwiZXhwIjoyMDY0NDU4OTIyfQ.L_NM27cVyq2uGNjtfzffRylBd5zEVOSxupqbYGVQwlc';

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