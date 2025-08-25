#!/usr/bin/env node

/**
 * Create test issue and verify admin close functionality
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

async function testAdminClose() {
    try {
        console.log('🧪 Testing admin close functionality...\n');
        
        // Get next issue number
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
        
        // Create a test issue
        const testIssue = {
            issueNumber: nextNumber,
            actionType: 'test',
            target: 'Admin Close Test',
            description: 'Test issue to verify bart can close it',
            priority: 'low',
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
        
        console.log(`✅ Created test Issue #${nextNumber}`);
        
        // Verify the HTML has admin features
        const { data: tracker } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        const html = tracker.html_content;
        
        console.log('\n🔍 Verification checks:');
        const checks = [
            { name: 'closeTicket function exists', found: html.includes('function closeTicket') },
            { name: 'Checks for bart user', found: html.includes("currentUser.handle === 'bart'") },
            { name: 'Close button in template', found: html.includes('close-button') },
            { name: 'Admin indicator function', found: html.includes('updateAdminIndicator') },
            { name: 'Close button styles', found: html.includes('.close-button {') }
        ];
        
        checks.forEach(check => {
            console.log(`  ${check.found ? '✓' : '✗'} ${check.name}`);
        });
        
        const allPassed = checks.every(c => c.found);
        
        if (allPassed) {
            console.log('\n🎉 All admin features are properly configured!');
        } else {
            console.log('\n⚠️  Some features may be missing');
        }
        
        console.log('\n📋 Test Instructions:');
        console.log('1. Go to https://webtoys.ai/public/toybox-os');
        console.log('2. Login as "bart" (use your 4-digit PIN)');
        console.log('3. Open the Issue Tracker');
        console.log('4. Look for:');
        console.log('   • "👑 Admin Mode Active" badge in header');
        console.log(`   • Issue #${nextNumber} with "Close Issue" button`);
        console.log('5. Click "Close Issue" to test closing');
        console.log('\nOther users will NOT see close buttons - only bart has this power!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAdminClose();