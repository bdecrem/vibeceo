#!/usr/bin/env node

/**
 * Emergency restore from bart/issue-tracker
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function emergencyRestore() {
    try {
        console.log('🚨 EMERGENCY RESTORE from bart/issue-tracker...\n');
        
        // Get the working version
        const { data: source, error: sourceError } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'bart')
            .eq('app_slug', 'issue-tracker')
            .single();
        
        if (sourceError || !source) {
            console.error('❌ Cannot find bart/issue-tracker:', sourceError?.message);
            return;
        }
        
        console.log('✅ Found working version\n');
        
        // Update with new app_id and title
        let html = source.html_content;
        
        // Change title
        html = html.replace(
            '<title>Issue Tracker</title>',
            '<title>WebtoysOS Fixit Board</title>'
        );
        html = html.replace(
            '<h1 style="margin: 0 0 30px 0; font-size: 2.5rem; font-weight: 900; letter-spacing: -0.02em;">Issue Tracker</h1>',
            '<h1 style="margin: 0 0 30px 0; font-size: 2.5rem; font-weight: 900; letter-spacing: -0.02em;">WebtoysOS Fixit Board</h1>'
        );
        
        // Change APP_ID
        html = html.replace(
            "window.APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';",
            "window.APP_ID = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';"
        );
        
        console.log('💾 Restoring to public/webtoysos-issue-tracker...');
        
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
        
        console.log('✅ RESTORED successfully!\n');
        console.log('📋 What was restored:');
        console.log('• Clean working version from bart/issue-tracker');
        console.log('• Title changed to "WebtoysOS Fixit Board"');
        console.log('• App ID: 5b98f08a-60c7-48cd-bd1c-fb4bad3615ae\n');
        console.log('🔗 Check: https://webtoys.ai/public/webtoysos-issue-tracker');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

emergencyRestore();
