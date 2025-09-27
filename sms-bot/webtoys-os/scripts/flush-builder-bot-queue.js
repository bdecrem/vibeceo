#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ISSUE_TRACKER_APP_ID = 'toybox-issue-tracker-v3';
const APP_ID = 'toybox-builder-bot';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function zadInsert(action_type, content_data, participant_id = 'system') {
  const { error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert({ app_id: APP_ID, action_type, content_data, participant_id, created_at: new Date() });
  if (error) throw error;
}

async function main() {
  const now = new Date().toISOString();
  // Release lock
  await zadInsert('lock', { locked_by: null, released_by: 'admin', released_at: now }, 'system');

  // Close pending builder-bot issues
  const { data: pending, error: qerr } = await supabase
    .from('webtoys_issue_tracker_data')
    .select('id, content_data')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('content_data->>source', 'builder-bot')
    .in('content_data->>status', ['new','open','processing'])
    .limit(200);
  if (qerr) throw qerr;

  let count = 0;
  for (const row of (pending || [])) {
    const cd = row.content_data || {};
    const updated = {
      ...cd,
      status: 'completed',
      admin_comments: [
        ...(cd.admin_comments || []),
        { text: `Flushed for test at ${now}`, author: 'Builder Bot', authorRole: 'SYSTEM', timestamp: now }
      ]
    };
    const { error: uerr } = await supabase
      .from('webtoys_issue_tracker_data')
      .update({ content_data: updated })
      .eq('id', row.id);
    if (uerr) throw uerr;
    count++;
  }

  await zadInsert('chat_message', { author: 'BUILDER_BOT', text: 'Queue flushed. Ready for next request.', timestamp: Date.now() }, 'system');
  console.log(`✅ Flushed. Closed ${count} pending issue(s), lock released.`);
}

main().catch(e => { console.error('❌ Flush failed:', e.message); process.exit(1); });

