#!/usr/bin/env node

/**
 * Create a test issue to verify numbering system works
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTestIssue() {
    try {
        console.log('🎯 Creating test issue to verify numbering...');
        
        // Get the next issue number
        const { data: counterData } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('content_data')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'issue_counter')
            .order('created_at', { ascending: false })
            .limit(1);
        
        let nextNumber = 1;
        if (counterData && counterData.length > 0) {
            const lastCounter = counterData[0].content_data;
            nextNumber = (lastCounter.lastNumber || 0) + 1;
        }
        
        // Update the counter
        await supabase
            .from('wtaf_zero_admin_collaborative')
            .insert({
                app_id: 'toybox-issue-tracker',
                action_type: 'issue_counter',
                content_data: { lastNumber: nextNumber },
                participant_id: 'test-script'
            });
        
        // Create test issue
        const testIssue = {
            issueNumber: nextNumber,
            actionType: 'fix',
            target: 'Issue Display',
            description: 'Test issue to verify ticket numbers are displayed correctly',
            priority: 'medium',
            submittedBy: 'test-script',
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        const { error } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .insert({
                app_id: 'toybox-issue-tracker',
                action_type: 'update_request',
                content_data: testIssue,
                participant_id: 'test-script'
            });
        
        if (error) throw error;
        
        console.log(`✅ Test Issue #${nextNumber} created!`);
        console.log('\n📋 Issue Details:');
        console.log(`  • Number: #${nextNumber}`);
        console.log(`  • Type: ${testIssue.actionType}`);
        console.log(`  • Target: ${testIssue.target}`);
        console.log(`  • Description: ${testIssue.description}`);
        console.log('\n🔄 Refresh the Issue Tracker to see the test issue with its number!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed to create test issue:', error);
        process.exit(1);
    }
}

createTestIssue();