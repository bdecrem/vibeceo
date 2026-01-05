const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../sms-bot/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

(async () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: messages, error } = await supabase
    .from('incubator_messages')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }

  if (!messages || messages.length === 0) {
    console.log('No messages found in last 7 days');
    return;
  }

  // Group by agent
  const byAgent = {};
  for (const msg of messages) {
    const agent = msg.agent_id;
    if (!byAgent[agent]) byAgent[agent] = [];
    byAgent[agent].push(msg);
  }

  // Show results
  for (const [agentId, msgs] of Object.entries(byAgent).sort()) {
    console.log('\n' + '='.repeat(50));
    console.log(`${agentId.toUpperCase()} - ${msgs.length} messages in last 7 days`);
    console.log('='.repeat(50));

    msgs.slice(0, 5).forEach(msg => {
      const date = msg.created_at.substring(0, 10);
      const content = (msg.content || '').substring(0, 150);
      console.log(`[${date}] [${msg.scope}] ${msg.type}: ${content}`);
    });

    if (msgs.length > 5) {
      console.log(`... and ${msgs.length - 5} more messages`);
    }
  }
})();
