#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-issue-tracker-v3';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findLatestBuilderBotIssue() {
  const { data, error } = await supabase
    .from('webtoys_issue_tracker_data')
    .select('id, created_at, content_data')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .in('content_data->>status', ['new','open','processing'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function main() {
  const issue = await findLatestBuilderBotIssue();
  if (!issue) {
    console.log('✅ No pending Builder Bot issues.');
    return;
  }
  console.log(`🚀 Forcing agent on issue #${issue.id} (${issue.content_data?.title||''})`);
  const child = spawn('/usr/local/bin/node', ['execute-open-issue-v2.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      ISSUE_TRACKER_APP_ID,
      BUILDER_BOT_MODE: 'true',
      BUILDER_BOT_FORCE: 'true',
      BUILDER_BOT_ISSUE_ID: String(issue.id)
    },
    stdio: 'inherit'
  });
  child.on('close', (code) => {
    console.log(`✅ Agent finished with code ${code}`);
  });
}

main().catch(err => { console.error('❌ run-latest failed:', err.message); process.exit(1); });

