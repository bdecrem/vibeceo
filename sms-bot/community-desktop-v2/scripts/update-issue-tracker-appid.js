#!/usr/bin/env node

/**
 * Update webtoysos-issue-tracker to use its own unique app_id in ZAD
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

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

async function updateAppId() {
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
        
        // Generate a unique UUID for this app
        const newAppId = crypto.randomUUID();
        console.log(`🔑 Generated new app_id: ${newAppId}`);
        
        console.log('🔍 Finding and replacing app_id in the HTML...');
        
        // Find the current app_id (it's likely the one from bart's issue-tracker)
        // Look for patterns like: window.APP_ID = '...' or const APP_ID = '...'
        const appIdPatterns = [
            /window\.APP_ID\s*=\s*['"]([^'"]+)['"]/g,
            /const\s+APP_ID\s*=\s*['"]([^'"]+)['"]/g,
            /let\s+APP_ID\s*=\s*['"]([^'"]+)['"]/g,
            /var\s+APP_ID\s*=\s*['"]([^'"]+)['"]/g,
            /APP_ID\s*=\s*['"]([^'"]+)['"]/g
        ];
        
        let currentAppId = null;
        for (const pattern of appIdPatterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                currentAppId = matches[0][1];
                console.log(`   Found current app_id: ${currentAppId}`);
                break;
            }
        }
        
        if (currentAppId) {
            // Replace all instances of the old app_id with the new one
            const oldIdRegex = new RegExp(currentAppId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            html = html.replace(oldIdRegex, newAppId);
            console.log(`   Replaced ${(html.match(new RegExp(newAppId, 'g')) || []).length} instances`);
        } else {
            // If no app_id found, we need to add one
            console.log('   No existing app_id found, adding new one...');
            
            // Look for where to insert it (usually near the beginning of the script)
            const scriptStart = html.indexOf('<script>');
            if (scriptStart > -1) {
                const insertPoint = scriptStart + '<script>'.length;
                const appIdDeclaration = `\n        // Unique app ID for WebtoysOS Fixit Board\n        window.APP_ID = '${newAppId}';\n`;
                html = html.substring(0, insertPoint) + appIdDeclaration + html.substring(insertPoint);
            }
        }
        
        // Also update the title in case it was missed
        html = html.replace(/<title>.*?<\/title>/i, '<title>WebtoysOS Fixit Board</title>');
        
        console.log('💾 Saving updated app with new app_id...');
        
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
        
        console.log('✅ Successfully updated app with new app_id!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   App: public/webtoysos-issue-tracker`);
        console.log(`   New app_id: ${newAppId}`);
        console.log(`   Old app_id: ${currentAppId || 'none found'}`);
        console.log('');
        console.log('🎉 The WebtoysOS Fixit Board now has its own ZAD storage!');
        console.log('   Data will be stored in wtaf_zero_admin_collaborative with this app_id');
        console.log('   View at: https://webtoys.ai/public/webtoysos-issue-tracker');
        
        // Optional: Check if there's any existing data we should migrate
        if (currentAppId) {
            console.log('\n🔍 Checking for existing data to migrate...');
            const { data: existingData, error: dataError } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('*')
                .eq('app_id', currentAppId)
                .eq('action_type', 'issue');
            
            if (existingData && existingData.length > 0) {
                console.log(`   Found ${existingData.length} issue(s) in the old app_id`);
                console.log('   Note: These will remain with the original app');
                console.log('   The new app starts fresh with its own data');
            } else {
                console.log('   No existing issues found (starting fresh)');
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

updateAppId();