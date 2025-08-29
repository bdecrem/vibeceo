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

async function addTestComment() {
    // First, fetch the test issue
    const { data: issues, error: fetchError } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('action_type', 'issue')
        .ilike('content_data->>title', '%Test Issue%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error('❌ Error fetching issue:', fetchError);
        return;
    }

    if (!issues || issues.length === 0) {
        console.error('❌ No test issue found');
        return;
    }

    const issue = issues[0];
    console.log('📋 Found issue:', issue.content_data.title);

    // Add a comment to the issue
    const comment = {
        text: "This is a test comment to verify the commenting functionality is working properly.",
        author: "test-commenter",
        timestamp: new Date().toISOString()
    };

    const updatedData = {
        ...issue.content_data,
        comments: [...(issue.content_data.comments || []), comment]
    };

    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .update({
            content_data: updatedData,
            updated_at: new Date().toISOString()
        })
        .eq('id', issue.id);

    if (error) {
        console.error('❌ Error adding comment:', error);
    } else {
        console.log('✅ Added test comment to issue');
        console.log('💬 Comment by:', comment.author);
        console.log('📝 Total comments:', updatedData.comments.length);
    }
}

addTestComment();