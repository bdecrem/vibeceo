#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testIssueTracker() {
    try {
        console.log('🧪 Testing Issue Tracker v3...\n');
        
        // 1. Create a test issue
        console.log('1️⃣ Creating test issue...');
        const testIssue = {
            title: 'Test Issue - Direct Supabase Access',
            description: 'This is a test issue to verify the new direct Supabase access is working correctly.',
            status: 'open',
            author: 'test-user',
            comments: [],
            created: new Date().toISOString()
        };
        
        const { data: createdIssue, error: createError } = await supabase
            .from('webtoys_issue_tracker_data')
            .insert({
                app_id: 'toybox-issue-tracker-v3',
                action_type: 'issue',
                participant_id: 'test-user',
                content_data: testIssue
            })
            .select()
            .single();
        
        if (createError) throw createError;
        console.log('✅ Issue created with ID:', createdIssue.id);
        
        // 2. Add a comment to the issue
        console.log('\n2️⃣ Adding comment to issue...');
        const updatedData = {
            ...createdIssue.content_data,
            comments: [{
                text: 'This is a test comment added via UPDATE operation',
                author: 'test-user',
                timestamp: new Date().toISOString()
            }]
        };
        
        const { data: updatedIssue, error: updateError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: updatedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', createdIssue.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        console.log('✅ Comment added successfully');
        
        // 3. Close the issue
        console.log('\n3️⃣ Closing the issue...');
        const closedData = {
            ...updatedIssue.content_data,
            status: 'completed',
            closedAt: new Date().toISOString(),
            closedBy: 'test-user'
        };
        
        const { data: closedIssue, error: closeError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: closedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', createdIssue.id)
            .select()
            .single();
        
        if (closeError) throw closeError;
        console.log('✅ Issue closed successfully');
        
        // 4. Verify the data
        console.log('\n4️⃣ Verifying final state...');
        const { data: finalIssue, error: fetchError } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('id', createdIssue.id)
            .single();
        
        if (fetchError) throw fetchError;
        
        console.log('✅ Final issue state:');
        console.log('  - ID:', finalIssue.id);
        console.log('  - Title:', finalIssue.content_data.title);
        console.log('  - Status:', finalIssue.content_data.status);
        console.log('  - Comments:', finalIssue.content_data.comments.length);
        console.log('  - Closed by:', finalIssue.content_data.closedBy);
        
        // 5. Clean up - soft delete the test issue
        console.log('\n5️⃣ Cleaning up test data...');
        const deletedData = {
            ...finalIssue.content_data,
            deleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: 'test-cleanup'
        };
        
        const { error: deleteError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: deletedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', createdIssue.id);
        
        if (deleteError) throw deleteError;
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎉 All tests passed! Issue Tracker v3 is working correctly with direct Supabase access.');
        console.log('📍 You can now access it at: https://webtoys.ai/public/toybox-issue-tracker-v3');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testIssueTracker();