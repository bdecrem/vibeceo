#!/usr/bin/env node

/**
 * Update the title of webtoysos-issue-tracker to "WebtoysOS Fixit Board"
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

async function updateTitle() {
    try {
        console.log('📥 Fetching webtoysos-issue-tracker...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('❌ Error fetching app:', error?.message || 'Not found');
            return;
        }
        
        let html = data.html_content;
        
        console.log('🔍 Updating title to "WebtoysOS Fixit Board"...');
        
        // Update the <title> tag
        html = html.replace(/<title>.*?<\/title>/i, '<title>WebtoysOS Fixit Board</title>');
        
        // Update the h1 header if it exists
        html = html.replace(/<h1[^>]*>.*?Issue Tracker.*?<\/h1>/i, '<h1>WebtoysOS Fixit Board</h1>');
        
        // Update any other references to "Issue Tracker" in headers
        html = html.replace(/Issue Tracker/g, 'WebtoysOS Fixit Board');
        
        console.log('💾 Saving updated app...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker');
        
        if (updateError) {
            console.error('❌ Error updating app:', updateError.message);
            return;
        }
        
        console.log('✅ Successfully updated title to "WebtoysOS Fixit Board"!');
        console.log('');
        console.log('🔗 View at: https://webtoys.ai/public/webtoysos-issue-tracker');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

updateTitle();