#!/usr/bin/env node

/**
 * Verify the Add Comment fix was applied to the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function verifyFix() {
    console.log('🔍 Verifying Add Comment fix in database...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // Fetch current issue tracker HTML from database
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch toybox-issue-tracker:', fetchError);
            return;
        }
        
        const html = current.html_content;
        console.log('✅ Fetched from database');
        console.log('📅 Last updated:', current.updated_at);
        
        // Check for the fixes
        console.log('\n🔍 Checking for fixes:\n');
        
        // 1. Check if comment button has restricted access
        if (html.includes("currentUser.handle === 'bart' || currentUser.handle === 'agent' || currentUser.handle === 'edit-agent'")) {
            console.log('✅ Comment button restriction is present');
        } else {
            console.log('❌ Comment button restriction NOT found');
            
            // Check what's actually there
            const commentButtonMatch = html.match(/const commentButton = ([^;]*);/);
            if (commentButtonMatch) {
                console.log('Current comment button logic:', commentButtonMatch[1].substring(0, 100) + '...');
            }
        }
        
        // 2. Check if addComment uses issueNumber correctly
        if (html.includes('prompt(`Add comment for issue #${issueNumber}:`')) {
            console.log('✅ Issue number fix is present');
        } else if (html.includes('prompt(`Add comment for issue #${data.issueNumber}:`')) {
            console.log('⚠️ Still using data.issueNumber (might work but not ideal)');
        } else {
            console.log('❌ Issue number fix NOT found');
        }
        
        // 3. Check for permission check in addComment
        if (html.includes('Only administrators can add comments')) {
            console.log('✅ Permission check message is present');
        } else {
            console.log('❌ Permission check NOT found');
        }
        
        // 4. Check deduplication is preserved
        if (html.includes('const issueMap = new Map()')) {
            console.log('✅ Deduplication logic is preserved');
        } else {
            console.log('❌ Deduplication might be broken!');
        }
        
        // 5. Check OPEN/CLOSE button fixes
        if (html.includes("data.status !== 'open'") && html.includes("data.status !== 'closed'")) {
            console.log('✅ OPEN/CLOSE button fixes are preserved');
        } else {
            console.log('⚠️ OPEN/CLOSE button logic might have changed');
        }
        
        console.log('\n📊 Summary:');
        console.log('Database record last updated:', current.updated_at);
        console.log('If fixes are missing, the update may have failed or been overwritten.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run verification
verifyFix();