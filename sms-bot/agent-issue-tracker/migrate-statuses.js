import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

// Status migration mapping
const STATUS_MIGRATION = {
  'new': 'Backlog',
  'reformulated': 'Todo',
  'needs_info': 'Needs Info',
  'admin_discussion': 'Needs Info',
  'fixing': 'In Progress',
  'fixed': 'Done',
  'pr-created': 'Done',
  'merged': 'Done',
  'closed': 'Canceled',
  'wontfix': 'Canceled',
  'answered': 'Done',
  'fix-failed': 'Todo',
  'error': 'Needs Info'
};

async function migrateStatuses() {
  console.log('🔄 Starting status migration...');
  
  // Load all issues
  const { data: issues, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');
    
  if (error) {
    console.error('Error loading issues:', error);
    return;
  }
  
  console.log(`📊 Found ${issues.length} issues to migrate`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const record of issues) {
    const oldStatus = record.content_data?.status;
    
    // Skip if already using new status format
    if (['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled', 'Duplicate', 'Needs Info'].includes(oldStatus)) {
      console.log(`⏭️  Issue #${record.id} already migrated (${oldStatus})`);
      skipped++;
      continue;
    }
    
    const newStatus = STATUS_MIGRATION[oldStatus] || 'Backlog';
    
    console.log(`📝 Issue #${record.id}: ${oldStatus} → ${newStatus}`);
    
    // Update the record
    const updatedContent = {
      ...record.content_data,
      status: newStatus,
      old_status: oldStatus, // Keep track of old status
      migrated_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .update({ 
        content_data: updatedContent,
        updated_at: new Date()
      })
      .eq('id', record.id);
      
    if (updateError) {
      console.error(`❌ Failed to update issue #${record.id}:`, updateError);
    } else {
      migrated++;
    }
  }
  
  console.log('\n✅ Migration complete!');
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${issues.length}`);
}

// Run migration
migrateStatuses().catch(console.error);