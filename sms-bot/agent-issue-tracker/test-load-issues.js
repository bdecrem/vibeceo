#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('Testing issue loading...\n');
console.log('ISSUE_TRACKER_APP_ID:', process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker';

// Test the exact query used by reformulate-issues.js
const { data, error } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .select('*')
  .eq('app_id', ISSUE_TRACKER_APP_ID)
  .eq('action_type', 'issue');

console.log('Query result:');
console.log('- Error:', error);
console.log('- Data count:', data?.length || 0);

if (data && data.length > 0) {
  console.log('\nFound issues:');
  data.forEach((record, i) => {
    const content = record.content_data || {};
    const status = content.status || 'new';
    console.log(`\n${i + 1}. Issue ID ${record.id}:`);
    console.log('   Status:', status);
    console.log('   Content:', JSON.stringify(content, null, 2));
    console.log('   Passes filter?:', status === 'new' || (!content.status && 'new' === 'new'));
  });
  
  // Test the filter
  const filtered = data.filter(record => {
    const content = record.content_data || {};
    return content.status === 'new' || (!content.status && 'new' === 'new');
  });
  
  console.log(`\nAfter filtering for status='new': ${filtered.length} issues`);
}