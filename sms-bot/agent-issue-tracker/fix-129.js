#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fix129() {
  // Find issue #129
  const { data: issues } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker')
    .eq('action_type', 'issue');

  const issue129 = issues.find(i => i.content_data?.issue_number === 129);

  if (issue129) {
    console.log('Found issue #129, current status:', issue129.content_data.status);
    console.log('Current confidence:', issue129.content_data.confidence);
    
    // Update to high confidence and reformulated status
    const updatedContent = {
      ...issue129.content_data,
      status: 'reformulated',
      confidence: 'high',
      needs_clarification: null,
      reformulated: 'Add a link to the issue tracker at the bottom of the WEBTOYS homepage (wtaf-landing page)',
      ash_comment: 'Clear request - adding that issue tracker link to the homepage footer. This will help users report bugs directly!'
    };
    
    const { error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .update({ 
        content_data: updatedContent,
        updated_at: new Date()
      })
      .eq('id', issue129.id);
    
    if (!error) {
      console.log('✅ Fixed issue #129 - now high confidence and reformulated');
      console.log('The fix agent should pick it up in the next run');
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('Issue #129 not found');
  }
}

fix129();