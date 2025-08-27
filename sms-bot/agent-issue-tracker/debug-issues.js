#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-direct-updates';

async function debugIssues() {
    console.log('🔍 Debugging Issue Tracker');
    console.log('📋 Using APP_ID:', ISSUE_TRACKER_APP_ID);
    
    // Fetch ALL issues for this app_id
    const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('action_type', 'update_request')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`\n📊 Found ${data.length} total issues\n`);
    
    data.forEach((issue, idx) => {
        const content = typeof issue.content_data === 'string' ? JSON.parse(issue.content_data) : issue.content_data;
        console.log(`Issue #${idx + 1}:`);
        console.log(`  ID: ${issue.id}`);
        console.log(`  Status: ${content.status}`);
        console.log(`  Issue Number: ${content.issueNumber}`);
        console.log(`  Description: ${content.description?.substring(0, 50)}...`);
        console.log(`  Submitted By: ${content.submittedBy}`);
        console.log('---');
    });
}

debugIssues();