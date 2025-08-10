#!/usr/bin/env node

/**
 * Debug current issues in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.env.PROJECT_ROOT || '/Users/bartbart/Documents/VibeCEO8/sms-bot', '.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(process.env.PROJECT_ROOT || '/Users/bartbart/Documents/VibeCEO8/sms-bot', '.env') });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

async function debugIssues() {
  console.log('🔍 Debugging current issues in the database...\n');
  
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error loading issues:', error);
    return;
  }

  console.log(`📊 Total issues found: ${data.length}\n`);
  
  // Group by status
  const statusGroups = data.reduce((acc, issue) => {
    const status = issue.content_data?.status || 'new';
    if (!acc[status]) acc[status] = [];
    acc[status].push(issue);
    return acc;
  }, {});

  console.log('📈 Issues by status:');
  Object.keys(statusGroups).forEach(status => {
    console.log(`  ${status}: ${statusGroups[status].length} issues`);
  });

  console.log('\n📝 Recent issues:');
  data.slice(0, 5).forEach((issue, index) => {
    const content = issue.content_data || {};
    console.log(`\n${index + 1}. Issue ID: ${issue.id}`);
    console.log(`   Status: ${content.status || 'new'}`);
    console.log(`   Title: "${content.idea || 'No description'}"`);
    console.log(`   Author: ${content.author || 'Anonymous'}`);
    console.log(`   Category: ${content.category || 'uncategorized'}`);
    console.log(`   Created: ${new Date(issue.created_at).toLocaleString()}`);
    if (content.reformulated) {
      console.log(`   Reformulated: "${content.reformulated}"`);
    }
    if (content.cass_comment) {
      console.log(`   Cass Comment: "${content.cass_comment}"`);
    }
  });

  // Check for "new" issues specifically
  const newIssues = data.filter(issue => {
    const status = issue.content_data?.status;
    return status === 'new' || !status;
  });

  console.log(`\n🆕 "New" issues (should be processed by reformulation agent): ${newIssues.length}`);
  newIssues.forEach((issue, index) => {
    const content = issue.content_data || {};
    console.log(`\n  ${index + 1}. "${content.idea || 'No description'}"`);
    console.log(`     Status: ${content.status || 'undefined (treated as new)'}`);
    console.log(`     Created: ${new Date(issue.created_at).toLocaleString()}`);
  });
}

debugIssues()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });