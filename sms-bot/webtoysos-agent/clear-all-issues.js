#!/usr/bin/env node

/**
 * Clear ALL issues by marking them as Canceled
 * This gives us a clean slate for testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

async function clearAllIssues() {
  console.log('🧹 Clearing ALL issues to create a clean slate...');
  
  // Get ALL issues
  const { data: allIssues, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');
    
  if (error) {
    console.error('Error loading issues:', error);
    return;
  }
  
  console.log(`Found ${allIssues.length} total issues to clear`);
  
  let cleared = 0;
  
  for (const record of allIssues) {
    const content = record.content_data || {};
    
    // Skip if already Canceled or Done
    if (content.status === 'Canceled' || content.status === 'Done') {
      continue;
    }
    
    console.log(`Canceling #${record.id}: ${(content.idea || content.reformulated || '').substring(0, 50)}...`);
    
    const updatedContent = {
      ...content,
      status: 'Canceled',
      canceled_reason: 'Bulk cleanup for fresh testing slate',
      canceled_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .update({ 
        content_data: updatedContent,
        updated_at: new Date()
      })
      .eq('id', record.id);
      
    if (!updateError) {
      cleared++;
    } else {
      console.error(`Failed to clear #${record.id}:`, updateError);
    }
  }
  
  console.log(`\n✅ Cleared ${cleared} issues!`);
  console.log('🎉 You now have a clean slate for testing!');
}

clearAllIssues()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });