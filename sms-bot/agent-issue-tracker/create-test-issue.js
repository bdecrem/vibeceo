#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-direct-updates';

async function createTestIssue() {
    const issue = {
        title: "Fix button color issue",
        description: "fix the login button color to be more visible on the main page",
        status: "open",
        priority: "medium",
        created_by: "bart"
    };

    console.log('Using app ID:', ISSUE_TRACKER_APP_ID);

    const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .insert({
            app_id: ISSUE_TRACKER_APP_ID,
            action_type: 'update_request',
            participant_id: 'bart',
            content_data: JSON.stringify(issue)
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
