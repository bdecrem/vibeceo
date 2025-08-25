#!/usr/bin/env node

/**
 * Verify authentication is working in Issue Tracker
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

async function verifyAuth() {
    try {
        console.log('🔍 Verifying authentication setup in Issue Tracker...\n');
        
        // Check the Issue Tracker HTML
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        const html = data.html_content;
        
        // Check for key authentication patterns
        const checks = [
            {
                name: 'Uses currentUser variable',
                pattern: /let currentUser = null/,
                found: false
            },
            {
                name: 'Has loadAuth function',
                pattern: /function loadAuth\(\)/,
                found: false
            },
            {
                name: 'Loads from localStorage',
                pattern: /localStorage\.getItem\('toybox_user'\)/,
                found: false
            },
            {
                name: 'Listens for TOYBOX_AUTH messages',
                pattern: /event\.data\.type === 'TOYBOX_AUTH'/,
                found: false
            },
            {
                name: 'Uses currentUser.handle for submittedBy',
                pattern: /submittedBy:\s*currentUser\?\.handle/,
                found: false
            },
            {
                name: 'Updates UI on auth change',
                pattern: /updateCurrentUserInfo/,
                found: false
            }
        ];
        
        // Run checks
        checks.forEach(check => {
            check.found = check.pattern.test(html);
        });
        
        // Display results
        console.log('✅ Authentication Setup Check:\n');
        checks.forEach(check => {
            const status = check.found ? '✓' : '✗';
            const color = check.found ? '\x1b[32m' : '\x1b[31m';
            console.log(`${color}${status}\x1b[0m ${check.name}`);
        });
        
        const allPassed = checks.every(c => c.found);
        
        if (allPassed) {
            console.log('\n🎉 All authentication checks passed!');
            console.log('The Issue Tracker should now properly use login information.');
        } else {
            console.log('\n⚠️  Some checks failed. Authentication may not work properly.');
        }
        
        // Check recent issues for usernames
        console.log('\n📊 Checking recent issues for usernames:');
        const { data: issues } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('content_data, created_at')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'update_request')
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (issues && issues.length > 0) {
            issues.forEach(issue => {
                const data = issue.content_data;
                console.log(`  Issue #${data.issueNumber}: submitted by "${data.submittedBy}"`);
            });
        } else {
            console.log('  No issues found');
        }
        
        console.log('\n🔄 Next steps:');
        console.log('1. Go to https://webtoys.ai/public/toybox-os');
        console.log('2. Login with your handle (e.g., "bart")');
        console.log('3. Open the Issue Tracker');
        console.log('4. Create a new issue');
        console.log('5. Your handle should appear on the ticket (not "anonymous")');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyAuth();