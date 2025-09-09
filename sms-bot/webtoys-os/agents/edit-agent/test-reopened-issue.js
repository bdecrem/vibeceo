#!/usr/bin/env node

/**
 * Test reopened issue handling
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = 'toybox-issue-tracker-v3';

async function createTestIssue() {
    console.log('📝 Creating test issue with reopened scenario...\n');
    
    // Create an issue that simulates being reopened with a comment
    const testIssue = {
        app_id: ISSUE_TRACKER_APP_ID,
        content_data: {
            title: 'Test Reopened Issue Handling',
            description: 'Create a simple counter app with increment and decrement buttons',
            author: 'test-user',
            status: 'open',  // Reopened status
            created: new Date().toISOString(),
            reopenedAt: new Date().toISOString(),  // Mark as reopened
            reopenedBy: 'test-user',
            // Simulate previous agent response
            admin_comments: [
                {
                    text: `## Edit Agent V2 Execution Log\n\n### Claude Code Output:\n\nI've created a simple counter app with increment and decrement buttons. The app tracks the count in localStorage and displays it prominently.\n\n### Execution Details:\n- Duration: 5 seconds\n- Status: completed`,
                    author: 'Edit Agent V2',
                    authorRole: 'AGENT',
                    timestamp: new Date(Date.now() - 60000).toISOString()  // 1 minute ago
                }
            ],
            // User's new comment after reopening
            comments: [
                {
                    text: 'The counter works but it needs a reset button to set it back to zero. Also, can you add a display showing the highest count reached in this session?',
                    author: 'test-user',
                    timestamp: new Date().toISOString()  // Now
                }
            ]
        }
    };
    
    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .insert(testIssue)
        .select()
        .single();
    
    if (error) {
        console.error('❌ Failed to create test issue:', error);
        return null;
    }
    
    console.log('✅ Created test issue #' + data.id);
    console.log('📋 Issue details:');
    console.log('   - Status: reopened (open)');
    console.log('   - Has previous agent response: Yes');
    console.log('   - Has new user comment: Yes');
    console.log('   - Comment asks for: Reset button + highest count display');
    
    return data.id;
}

async function testPromptGeneration() {
    // Import the buildSmartPrompt function
    const { buildSmartPrompt } = await import('./execute-open-issue-v2.js');
    
    // Get the test issue
    const { data: issues } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('content_data->>title', 'Test Reopened Issue Handling')
        .order('created_at', { ascending: false })
        .limit(1);
    
    if (!issues || issues.length === 0) {
        console.error('❌ Test issue not found');
        return;
    }
    
    const issue = issues[0];
    const prompt = buildSmartPrompt(issue.content_data, issue.content_data.description);
    
    console.log('\n📝 Generated Prompt:\n');
    console.log('=' .repeat(80));
    console.log(prompt);
    console.log('=' .repeat(80));
    
    // Check if prompt correctly identifies this as a reopened issue
    if (prompt.includes('REOPENED issue with user feedback')) {
        console.log('\n✅ Correctly identified as reopened issue');
    } else {
        console.log('\n❌ Failed to identify as reopened issue');
    }
    
    // Check if it includes the user's new comment
    if (prompt.includes('reset button') && prompt.includes('highest count')) {
        console.log('✅ Includes user\'s new feedback');
    } else {
        console.log('❌ Missing user\'s new feedback');
    }
    
    // Check if it includes previous context
    if (prompt.includes('Previous Response')) {
        console.log('✅ Includes previous agent response for context');
    } else {
        console.log('❌ Missing previous context');
    }
}

// Run the test
(async () => {
    const issueId = await createTestIssue();
    if (issueId) {
        await testPromptGeneration();
    }
})();