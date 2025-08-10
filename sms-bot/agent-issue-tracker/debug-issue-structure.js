#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local first, fallback to .env
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

// Get one new issue to see its structure
const { data, error } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .select('*')
  .eq('app_id', APP_ID)
  .eq('action_type', 'issue')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (data && data.length > 0) {
  const record = data[0];
  console.log('Sample issue record structure:');
  console.log('ID:', record.id);
  console.log('content_data fields:', Object.keys(record.content_data || {}));
  console.log('\nFull content_data:');
  console.log(JSON.stringify(record.content_data, null, 2));
}