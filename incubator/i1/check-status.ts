import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function checkStatus() {
  // Check RivalAlert production status
  const { data: users } = await supabase
    .from('ra_users')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: competitors } = await supabase
    .from('ra_competitors')
    .select('*');

  const { data: snapshots } = await supabase
    .from('ra_snapshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(5);

  console.log('=== RivalAlert Production Status ===');
  console.log(`Users: ${users?.length || 0}`);
  console.log(`Competitors: ${competitors?.length || 0}`);
  console.log(`Recent snapshots: ${snapshots?.length || 0}`);

  if (snapshots && snapshots.length > 0) {
    console.log(`\nLast snapshot: ${snapshots[0].captured_at}`);
  }

  if (users && users.length > 0) {
    console.log('\nUser details:');
    users.forEach((u: any) => {
      const trialEnd = u.trial_ends_at ? new Date(u.trial_ends_at).toISOString().split('T')[0] : 'N/A';
      console.log(`  - ${u.email} (trial ends: ${trialEnd})`);
    });
  }
}

checkStatus().catch(console.error);
