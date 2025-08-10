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

console.log('Checking for app_id:', APP_ID);

// Get ALL records for this app
const { data, error } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .select('*')
  .eq('app_id', APP_ID);
  
if (error) {
  console.error('Error:', error);
} else {
  console.log('Found', data.length, 'total records');
  
  // Check action_types
  const actionTypes = [...new Set(data.map(d => d.action_type))];
  console.log('Action types:', actionTypes);
  
  // Filter for issues
  const issues = data.filter(d => d.action_type === 'issue');
  console.log('\nFound', issues.length, 'issue records:');
  
  // Check status in content_data
  issues.forEach(issue => {
    const status = issue.content_data?.status || 'unknown';
    console.log(`\nIssue #${issue.id}:`);
    console.log(`  Status: '${status}'`);
    console.log(`  Title: '${issue.content_data?.title || 'no title'}'`);
    console.log(`  Created: ${issue.created_at}`);
    if (status === 'new') {
      console.log('  ➡️ This should be picked up by reformulation!');
    }
  });
  
  const newIssues = issues.filter(i => i.content_data?.status === 'new');
  console.log(`\n✨ Issues with status='new': ${newIssues.length}`);
}