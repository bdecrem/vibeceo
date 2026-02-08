/**
 * Mark a cc_inbox email as handled in Supabase
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/mark-email-handled.ts <id> <action>
 *
 * Actions: replied, skipped, forwarded, noted
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const id = process.argv[2];
  const action = process.argv[3] || 'handled';

  if (!id) {
    console.error('Usage: mark-email-handled.ts <id> <action>');
    process.exit(1);
  }

  // Fetch current metadata
  const { data, error } = await supabase
    .from('amber_state')
    .select('metadata')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Failed to fetch email ${id}: ${error.message}`);
    process.exit(1);
  }

  // Update metadata with handled status
  const metadata = {
    ...data.metadata,
    status: 'handled',
    action,
    handled_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('amber_state')
    .update({ metadata })
    .eq('id', id);

  if (updateError) {
    console.error(`Failed to update email ${id}: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`Marked ${id} as handled (${action})`);
}

main();
