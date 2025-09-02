#!/usr/bin/env node

/**
 * Complete end-to-end test of the Edit Agent CLI
 * 1. Configure webhook URL in tracker (simulate browser localStorage)
 * 2. Create a new test issue via ZAD API
 * 3. Verify it gets processed automatically
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const WEBHOOK_URL = 'https://03ffa53d166c.ngrok.app';

async function createTestIssue() {
    console.log('🧪 Creating test issue directly in database...\n');
    
    const testIssue = {
        app_id: 'toybox-issue-tracker-v3',
        participant_id: 'EDIT-AGENT-TEST',
        action_type: 'issue',
        content_data: {
            title: 'Add a simple calculator widget',
            description: 'Add a basic calculator widget to the desktop with number buttons 0-9 and basic operations',
            author: 'edit-agent-test',
            status: 'open',
            created: new Date().toISOString(),
            comments: [],
            targetApp: 'toybox-os-v3-test'
        }
    };
    
    try {
        // Insert the test issue
        const { data, error } = await supabase
            .from('webtoys_issue_tracker_data')
            .insert(testIssue)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log(`✅ Test issue created with ID: ${data.id}`);
        console.log(`📝 Title: ${data.content_data.title}`);
        console.log(`📋 Description: ${data.content_data.description}`);
        
        // Now send webhook notification
        console.log('\n📡 Sending webhook notification...');
        
        const webhookPayload = {
            type: 'new_issue',
            issue: data,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${WEBHOOK_URL}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Webhook sent successfully: ${result.message}`);
            console.log(`📝 Request ID: ${result.requestId}`);
            
            console.log('\n🎯 Test complete! The issue should now be processed automatically.');
            console.log(`📊 Monitor progress at: http://localhost:3032/health`);
            console.log(`📋 Check issue status in tracker: https://webtoys.ai/public/toybox-issue-tracker-v3`);
            
        } else {
            console.log('❌ Webhook failed:', response.status, response.statusText);
        }
        
        return data.id;
        
    } catch (error) {
        console.error('❌ Failed to create test issue:', error.message);
    }
}

async function checkIssueStatus(issueId) {
    console.log(`\n🔍 Checking status of issue #${issueId}...`);
    
    try {
        const { data, error } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('content_data')
            .eq('id', issueId)
            .single();
        
        if (error) throw error;
        
        const status = data.content_data.status;
        const processedAt = data.content_data.processedAt;
        const processedBy = data.content_data.processedBy;
        
        console.log(`📊 Status: ${status}`);
        
        if (processedAt) {
            console.log(`⏰ Processed at: ${processedAt}`);
            console.log(`🤖 Processed by: ${processedBy}`);
        }
        
        if (status === 'completed') {
            console.log('🎉 SUCCESS! Issue was processed and completed!');
            return true;
        } else if (status === 'failed') {
            console.log('❌ Issue processing failed');
            return false;
        } else {
            console.log('⏳ Issue is still being processed...');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Failed to check issue status:', error.message);
        return false;
    }
}

async function runCompleteTest() {
    console.log('🚀 Starting complete end-to-end test...\n');
    
    // Create and process test issue
    const issueId = await createTestIssue();
    
    if (issueId) {
        console.log('\n⏱️ Waiting 10 seconds for processing to begin...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check status
        await checkIssueStatus(issueId);
        
        console.log('\n📝 Instructions to verify complete flow:');
        console.log('1. Watch the webhook server logs for processing updates');
        console.log('2. Check the issue tracker UI to see status changes');
        console.log('3. When complete, verify the toybox-os-v3-test app has been updated');
        console.log('\n✨ End-to-end test setup complete!');
    }
}

runCompleteTest().catch(console.error);