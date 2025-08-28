#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function clearAllIssues() {
    console.log('🗑️  Clearing all issues from toybox-issue-tracker-v3...\n');
    
    // Delete ALL issues for v3 tracker
    const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .delete()
        .eq('app_id', 'toybox-issue-tracker-v3')
        .eq('action_type', 'issue')
        .select();
    
    if (error) {
        console.error('❌ Error deleting issues:', error);
        return;
    }
    
    console.log(`✅ Deleted ${data.length} issues:`);
    data.forEach(issue => {
        const content = typeof issue.content_data === 'string' 
            ? JSON.parse(issue.content_data) 
            : issue.content_data;
        console.log(`   - Issue #${issue.id}: ${content.title || content.description}`);
    });
    
    console.log('\n✨ Issue tracker is now clean!');
}

clearAllIssues();