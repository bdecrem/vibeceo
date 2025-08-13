import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

async function clearPendingIssues() {
  console.log('🧹 Clearing all pending issues...');
  
  // Get all issues
  const { data: allIssues, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');
    
  if (error) {
    console.error('Error loading issues:', error);
    return;
  }
  
  // Filter for Todo and In Progress statuses
  const issues = allIssues.filter(record => {
    const status = record.content_data?.status;
    return ['Todo', 'In Progress', 'reformulated', 'fixing'].includes(status);
  });
  
  console.log(`Found ${issues.length} pending issues to clear`);
  
  for (const record of issues) {
    const content = record.content_data || {};
    console.log(`Canceling #${record.id}: ${content.idea?.substring(0, 50)}...`);
    
    const updatedContent = {
      ...content,
      status: 'Canceled',
      canceled_reason: 'Bulk cleanup for testing',
      canceled_at: new Date().toISOString()
    };
    
    await supabase
      .from('wtaf_zero_admin_collaborative')
      .update({ 
        content_data: updatedContent,
        updated_at: new Date()
      })
      .eq('id', record.id);
  }
  
  console.log('✅ All pending issues cleared!');
}

clearPendingIssues().catch(console.error);