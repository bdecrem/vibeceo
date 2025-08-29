#!/usr/bin/env node

/**
 * Create test issues with different usernames to verify display
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

async function createUserTestIssues() {
    try {
        console.log('🎯 Creating test issues with different users...');
        
        // Test users
        const testUsers = [
            { username: 'BART', description: 'Admin user test issue' },
            { username: 'alice', description: 'Regular user test issue' },
            { username: 'anonymous', description: 'Anonymous user test issue' }
        ];
        
        for (const user of testUsers) {
            // Get the next issue number
            const { data: existingIssues } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('content_data')
                .eq('app_id', 'toybox-issue-tracker')
                .eq('action_type', 'update_request');
            
            let nextNumber = 1;
            if (existingIssues && existingIssues.length > 0) {
                const highestNumber = existingIssues.reduce((max, issue) => {
                    const num = issue.content_data.issueNumber || 0;
                    return num > max ? num : max;
                }, 0);
                nextNumber = highestNumber + 1;
            }
            
            // Create test issue
            const testIssue = {
                issueNumber: nextNumber,
                actionType: 'test',
                target: 'Username Display Test',
                description: user.description,
                priority: 'low',
                submittedBy: user.username,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            const { error } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-issue-tracker',
                    action_type: 'update_request',
                    content_data: testIssue,
                    participant_id: user.username
                });
            
            if (error) throw error;
            
            console.log(`✅ Issue #${nextNumber} created by ${user.username}`);
        }
        
        console.log('\n📋 Test Issues Created:');
        console.log('  • One from BART (admin - should show in green)');
        console.log('  • One from alice (regular user - should show in green)');
        console.log('  • One from anonymous (should show in gray)');
        console.log('\n🔄 Refresh the Issue Tracker to see issues with usernames!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed to create test issues:', error);
        process.exit(1);
    }
}

createUserTestIssues();