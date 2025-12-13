import { createClient } from '@supabase/supabase-js';

// Try different env var names
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

console.log('URL exists:', !!url);
console.log('Key exists:', !!key);

if (!url || !key) {
  console.log('Missing Supabase credentials in env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  // Check subscriber
  const { data: sub, error: subErr } = await supabase
    .from('sms_subscribers')
    .select('phone_number, arxiv_graph_subscribed, arxiv_graph_last_sent_at')
    .eq('phone_number', '+16508989508')
    .single();

  console.log('\nSubscriber status:');
  console.log(JSON.stringify(sub || { error: subErr?.message }, null, 2));

  // Check recent reports
  const { data: reports, error: repErr } = await supabase
    .from('arxiv_graph_daily_reports')
    .select('report_date, created_at, total_papers, featured_count')
    .order('report_date', { ascending: false })
    .limit(5);

  console.log('\nRecent reports:');
  console.log(JSON.stringify(reports || { error: repErr?.message }, null, 2));

  // Check agent subscriptions table
  const { data: agentSubs, error: agentErr } = await supabase
    .from('agent_subscriptions')
    .select('phone_number, agent_slug, subscribed_at, last_report_sent_at')
    .eq('phone_number', '+16508989508')
    .eq('agent_slug', 'arxiv-graph');

  console.log('\nAgent subscriptions:');
  console.log(JSON.stringify(agentSubs || { error: agentErr?.message }, null, 2));
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
