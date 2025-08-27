#!/usr/bin/env node

/**
 * Restore webtoysos-issue-tracker to the last known good version
 * This will re-clone from bart/issue-tracker with just the app_id change
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
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

async function restoreIssueTracker() {
    try {
        console.log('🔄 Restoring webtoysos-issue-tracker from bart/issue-tracker...');
        
        // Fetch bart's original issue-tracker
        const { data: original, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'bart')
            .eq('app_slug', 'issue-tracker')
            .single();
        
        if (fetchError || !original) {
            console.error('❌ Error fetching bart/issue-tracker:', fetchError?.message || 'Not found');
            return;
        }
        
        console.log('✅ Found bart/issue-tracker');
        
        // Get the HTML and only change the app_id
        let html = original.html_content;
        
        // Replace the app_id
        const oldAppId = '83218c2e-281e-4265-a95f-1d3f763870d4';
        const newAppId = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';
        
        html = html.replace(new RegExp(oldAppId, 'g'), newAppId);
        
        // Update the title
        html = html.replace(/<title>.*?<\/title>/i, '<title>WebtoysOS Fixit Board</title>');
        html = html.replace(/>Issue Tracker</g, '>WebtoysOS Fixit Board<');
        
        console.log('💾 Restoring to Supabase...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker');
        
        if (updateError) {
            console.error('❌ Error updating:', updateError.message);
            return;
        }
        
        console.log('✅ Successfully restored webtoysos-issue-tracker!');
        console.log('');
        console.log('📋 Restored state:');
        console.log('   • Exact copy of bart/issue-tracker');
        console.log('   • App ID: 5b98f08a-60c7-48cd-bd1c-fb4bad3615ae');
        console.log('   • Title: WebtoysOS Fixit Board');
        console.log('   • Original authentication (API key) intact');
        console.log('');
        console.log('🔗 URL: https://webtoys.ai/public/webtoysos-issue-tracker');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

restoreIssueTracker();
