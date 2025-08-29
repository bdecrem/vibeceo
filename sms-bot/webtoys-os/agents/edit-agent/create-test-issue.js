#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-issue-tracker-v3';

async function createTestIssue() {
    const issue = {
        title: "Test Issue - Verify Tracker v3 is Working",
        description: "This is a test issue created to verify that the Issue Tracker v3 is working correctly. This issue should appear in the tracker with status 'open' and can be used to test commenting, closing, and reopening functionality.",
        status: "open",
        author: "test-user",
        comments: [],
        created: new Date().toISOString()
    };

    console.log('Using app ID:', ISSUE_TRACKER_APP_ID);

    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .insert({
            app_id: ISSUE_TRACKER_APP_ID,
            action_type: 'issue',
            participant_id: 'test-user',
            content_data: issue
        });

    if (error) {
        console.error('❌ Error creating issue:', error);
    } else {
        console.log('✅ Created test issue:', issue.title);
        console.log('📝 Status: open');
        console.log('🎯 Ready for agent processing');
    }
}

createTestIssue();
