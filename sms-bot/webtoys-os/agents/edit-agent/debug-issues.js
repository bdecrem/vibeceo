#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables properly
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-direct-updates';

async function debugIssues() {
    console.log('🔍 Debugging Issue Tracker');
    console.log('📋 Using APP_ID:', ISSUE_TRACKER_APP_ID);
    
    // Fetch ALL issues for this app_id
    // V3 uses 'issue' action_type, not 'update_request'
    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('action_type', 'issue')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`\n📊 Found ${data.length} total issues\n`);
    
    data.forEach((issue, idx) => {
        const content = typeof issue.content_data === 'string' ? JSON.parse(issue.content_data) : issue.content_data;
        console.log(`Issue #${issue.id}:`);  // Use database ID, not index
        console.log(`  Database ID: ${issue.id}`);
        console.log(`  Status: ${content.status}`);
        console.log(`  Title: ${content.title}`);  // V3 uses 'title' not 'issueNumber'
        console.log(`  Description: ${content.description?.substring(0, 50)}...`);
        console.log(`  Author: ${content.author || content.submittedBy}`);  // V3 uses 'author'
        console.log(`  Created: ${content.created || issue.created_at}`);
        console.log('---');
    });
}

debugIssues();