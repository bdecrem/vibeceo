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
const APP_ID = 'toybox-builder-bot';

async function unlock() {
  const release = { locked_by: null, released_by: 'admin', released_at: new Date().toISOString() };
  const { error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert({ app_id: APP_ID, action_type: 'lock', content_data: release, participant_id: 'system', created_at: new Date() });
  if (error) throw error;
  console.log('✅ Builder Bot lock cleared');
}

unlock().catch(err => { console.error('❌ Unlock failed:', err.message); process.exit(1); });

