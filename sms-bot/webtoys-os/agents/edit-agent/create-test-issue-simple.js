#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTestIssue() {
    const testIssue = {
        app_id: 'toybox-issue-tracker-v3',
        participant_id: 'TEST_USER_1234',
        action_type: 'issue',
        content_data: {
            title: "Test: Create simple Moi text editor",
            description: "Create a simple text editor app called Moi with basic text editing capabilities. It should allow users to type, save, and load text documents.",
            author: "test",
            status: "new",
            created_at: new Date().toISOString()
        }
    };

    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .insert(testIssue)
        .select();

    if (error) {
        console.error('❌ Error creating test issue:', error);
        return;
    }

    console.log('✅ Test issue created successfully!');
    console.log('Issue ID:', data[0].id);
    console.log('Title:', testIssue.content_data.title);
    console.log('Status:', testIssue.content_data.status);
}

createTestIssue();
