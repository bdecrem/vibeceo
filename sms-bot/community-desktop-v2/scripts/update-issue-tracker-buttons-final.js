#!/usr/bin/env node

/**
 * Update the issue tracker with the fixed button visibility logic
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let envLoaded = false;
const envPaths = [
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        console.log('✅ Loaded environment from:', path.basename(envPath));
        break;
    }
}

if (!envLoaded) {
    console.log('⚠️ No .env file found, using existing environment variables');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function updateIssueTracker() {
    console.log('📝 Updating issue tracker with fixed button logic...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // Read the fixed HTML from the backup file
        const fixedHtmlPath = path.join(__dirname, '../backups/toybox-issue-tracker_fix-buttons_2025-08-27T23-57-50.html');
        const html = fs.readFileSync(fixedHtmlPath, 'utf8');
        console.log('✅ Read fixed HTML from backup');
        
        // Verify the fixes are in place
        if (html.includes('if (data.status !== \'open\')')) {
            console.log('✅ Verified OPEN button fix is present');
        } else {
            console.error('❌ OPEN button fix not found!');
            return;
        }
        
        if (html.includes('if (data.status !== \'closed\')')) {
            console.log('✅ Verified CLOSE button fix is present');
        } else {
            console.error('❌ CLOSE button fix not found!');
            return;
        }
        
        if (html.includes('`Add comment for issue #${data.issueNumber}:`')) {
            console.log('✅ Add Comment fix is preserved');
        }
        
        // Update database
        console.log('\n💾 Updating database...');
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
            
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            return;
        }
        
        console.log('\n🎉 Successfully updated issue tracker!');
        console.log('📋 Button visibility for user bart:');
        console.log('  • OPEN button: Shows for all statuses except "open" (closed, pending, in-progress, etc.)');
        console.log('  • CLOSE button: Shows for all statuses except "closed" (open, pending, in-progress, etc.)');
        console.log('  • Add Comment: Works correctly with issue numbers');
        console.log('\n🔗 View at: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the update
updateIssueTracker();