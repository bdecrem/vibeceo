#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('🔎 Debugging Builder Bot state...');

  // 1) Recent chat messages
  const chats = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('id, created_at, participant_id, action_type, content_data')
    .eq('app_id', 'toybox-builder-bot')
    .in('action_type', ['chat_message', 'lock'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (chats.error) console.error('Chat query error:', chats.error);
  else {
    console.log('\n🗨️  Recent builder-bot rows:');
    chats.data.forEach(r => {
      const t = r.content_data?.text || '';
      const abbr = t.length > 60 ? t.slice(0,60)+'…' : t;
      console.log(`- [${r.action_type}] ${r.created_at} by ${r.participant_id}: ${abbr}`);
    });
  }

  // 2) Recent issues inserted by builder-bot
  const issues = await supabase
    .from('webtoys_issue_tracker_data')
    .select('id, created_at, content_data')
    .eq('app_id', 'toybox-issue-tracker-v3')
    .order('created_at', { ascending: false })
    .limit(10);

  if (issues.error) console.error('Issue query error:', issues.error);
  else {
    console.log('\n🐞 Recent issues (top 10):');
    issues.data.forEach(r => {
      const src = r.content_data?.source || 'n/a';
      const st = r.content_data?.status || 'n/a';
      const title = r.content_data?.title || '';
      console.log(`- #${r.id} ${r.created_at} [${src}] status=${st} title="${title}"`);
    });
  }
}

run().catch(e => { console.error('Debug failed:', e); process.exit(1); });

