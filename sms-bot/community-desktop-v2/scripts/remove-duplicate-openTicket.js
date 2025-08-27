#!/usr/bin/env node

/**
 * Remove duplicate openTicket function
 * 
 * There are two identical openTicket functions, we only need one
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function removeDuplicate() {
    console.log('🔧 Removing duplicate openTicket function...\n');
    
    // Fetch current Issue Tracker
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        console.error('❌ Failed to fetch:', error.message);
        return;
    }
    
    let html = data.html_content;
    
    // Find and remove the second openTicket function (lines 689-712)
    // It has a comment that says "// Open ticket function (change status from pending to open)"
    const duplicatePattern = /\n\s*\/\/ Open ticket function \(change status from pending to open\)\s*\n\s*async function openTicket\(issueNumber\) \{[\s\S]*?\n\s*\}\s*\n/;
    
    if (html.match(duplicatePattern)) {
        html = html.replace(duplicatePattern, '\n');
        console.log('✅ Removed duplicate openTicket function');
    } else {
        console.log('⚠️  No duplicate found (may have been already removed)');
    }
    
    // Update in database
    console.log('📤 Updating in database...');
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
        console.error('❌ Update failed:', updateError.message);
        return;
    }
    
    console.log('\n✅ Cleaned up duplicate function!');
    console.log('🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
}

removeDuplicate().catch(console.error);