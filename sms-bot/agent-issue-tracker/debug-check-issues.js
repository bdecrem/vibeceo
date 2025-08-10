#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local first, fallback to .env
dotenv.config({ path: path.join(__dirname, '../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

console.log('🔍 Debugging Issue Tracker Database Connection\n');
console.log('Environment variables:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('- ISSUE_TRACKER_APP_ID:', process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker');
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker';

async function checkDatabase() {
  console.log('📊 Checking database for issues...\n');
  
  // First, check if ANY records exist for this app_id
  console.log(`1. Checking for ANY records with app_id = '${ISSUE_TRACKER_APP_ID}':`);
  const { data: allRecords, error: allError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID);
  
  if (allError) {
    console.error('❌ Error querying database:', allError);
    return;
  }
  
  console.log(`   Found ${allRecords?.length || 0} total records\n`);
  
  // Check specifically for issue type records
  console.log(`2. Checking for records with action_type = 'issue':`);
  const { data: issueRecords, error: issueError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');
  
  if (issueError) {
    console.error('❌ Error querying issues:', issueError);
    return;
  }
  
  console.log(`   Found ${issueRecords?.length || 0} issue records\n`);
  
  // Show sample records if any exist
  if (issueRecords && issueRecords.length > 0) {
    console.log('3. Sample issue records:');
    issueRecords.slice(0, 3).forEach((record, i) => {
      console.log(`\n   Issue ${i + 1}:`);
      console.log(`   - ID: ${record.id}`);
      console.log(`   - Action Type: ${record.action_type}`);
      console.log(`   - Status: ${record.content_data?.status || 'new'}`);
      console.log(`   - Created: ${record.created_at}`);
      console.log(`   - Content:`, JSON.stringify(record.content_data, null, 2).substring(0, 200));
    });
  }
  
  // Check for records with different action_types to understand what's there
  console.log('\n4. Checking what action_types exist for this app:');
  const { data: actionTypes, error: actionError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('action_type')
    .eq('app_id', ISSUE_TRACKER_APP_ID);
  
  if (!actionError && actionTypes) {
    const uniqueTypes = [...new Set(actionTypes.map(r => r.action_type))];
    console.log('   Found action_types:', uniqueTypes.length > 0 ? uniqueTypes.join(', ') : 'None');
  }
  
  // Try to create a test issue if none exist
  if (!issueRecords || issueRecords.length === 0) {
    console.log('\n5. No issues found. Would you like to create a test issue?');
    console.log('   Run: node debug-check-issues.js --create-test');
  }
}

// Check if we should create a test issue
if (process.argv.includes('--create-test')) {
  console.log('\n📝 Creating test issue...');
  
  const testIssue = {
    app_id: ISSUE_TRACKER_APP_ID,
    action_type: 'issue',
    content_data: {
      status: 'new',
      title: 'Test Issue',
      description: 'The gallery page is not loading properly',
      userAgent: 'Test Script',
      timestamp: new Date().toISOString()
    },
    created_at: new Date(),
    updated_at: new Date()
  };
  
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert(testIssue)
    .select();
  
  if (error) {
    console.error('❌ Error creating test issue:', error);
  } else {
    console.log('✅ Test issue created successfully!');
    console.log('   ID:', data[0].id);
  }
}

await checkDatabase();