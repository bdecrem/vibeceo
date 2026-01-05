const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const message = process.argv[2];
const scope = process.argv[3] || 'SELF';
const type = process.argv[4] || 'observation';

if (!message) {
  console.error('Usage: node apex-write-message.cjs "message content" [scope] [type]');
  process.exit(1);
}

(async () => {
  const { error } = await supabase
    .from('incubator_messages')
    .insert({
      agent_id: 'i0',
      scope: scope,
      type: type,
      content: message,
      tags: ['team-status', 'autonomous']
    });

  if (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }

  console.log(`✅ ${scope} ${type} written to database`);
})();
