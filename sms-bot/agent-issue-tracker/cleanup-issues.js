#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanupIssues() {
  // Get all issues
  const { data: issues, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker')
    .eq('action_type', 'issue')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error loading issues:', error);
    return;
  }

  console.log('Processing issues...');
  let closed = 0;
  let kept = 0;

  for (const issue of issues) {
    // Keep issue 1975 (copyright notice) active
    if (issue.id === 1975) {
      console.log(`Keeping issue ${issue.id}: copyright notice`);
      kept++;
      continue;
    }
    
    // Close all other issues
    const currentStatus = issue.content_data?.status || 'new';
    if (currentStatus !== 'closed') {
      const updatedContent = {
        ...issue.content_data,
        status: 'closed',
        closed_reason: 'bulk_cleanup',
        closed_at: new Date().toISOString(),
        ash_comment: issue.content_data?.ash_comment || 'Closed during system cleanup - starting fresh with the issue tracker!'
      };
      
      const { error: updateError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({ 
          content_data: updatedContent,
          updated_at: new Date()
        })
        .eq('id', issue.id);
      
      if (!updateError) {
        const desc = issue.content_data?.idea?.substring(0, 50) || 'no description';
        console.log(`Closed issue ${issue.id}: ${desc}`);
        closed++;
      } else {
        console.error(`Failed to close issue ${issue.id}:`, updateError);
      }
    }
  }

  console.log(`\nSummary: Closed ${closed} issues, kept ${kept} active`);
}

// Run the cleanup
cleanupIssues()
  .then(() => {
    console.log('Cleanup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });