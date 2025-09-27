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
    const description = process.argv[2] || "Create a simple Hello World app that displays Hello World in big text";
    
    const testIssue = {
        app_id: 'toybox-issue-tracker-v3',
        action_type: 'issue',
        participant_id: 'TEST_1234',
        content_data: {
            description: description,
            status: 'open',
            created: new Date().toISOString(),
            id: Math.floor(Math.random() * 100000)
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

    console.log(`✅ Test issue created: "${description}"`);
    console.log(`📋 Issue ID: ${data[0].id}`);
}

createTestIssue();
