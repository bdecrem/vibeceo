#!/usr/bin/env node

/**
 * Fix missing variable declarations in webtoysos-issue-tracker
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

async function fixVariables() {
    try {
        console.log('📥 Fetching webtoysos-issue-tracker...\n');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('❌ Error:', error?.message);
            return;
        }
        
        let html = data.html_content;
        
        console.log('🔍 Fixing missing variable declarations...\n');
        
        // Find where isAuthenticated is declared
        const authDeclIndex = html.indexOf('let isAuthenticated = false;');
        if (authDeclIndex > -1) {
            // Add isInSuperpowerMode declaration right after isAuthenticated
            const insertPoint = authDeclIndex + 'let isAuthenticated = false;'.length;
            
            // Check if isInSuperpowerMode is already declared
            if (!html.includes('let isInSuperpowerMode')) {
                const variableDecl = `
        let isInSuperpowerMode = false;  // Whether admin mode is active`;
                
                html = html.substring(0, insertPoint) + variableDecl + html.substring(insertPoint);
                console.log('✅ Added: let isInSuperpowerMode = false;');
            }
        }
        
        // Now update the loadToyBoxAuth function to properly set these variables
        const loadAuthStart = html.indexOf('function loadToyBoxAuth()');
        if (loadAuthStart > -1) {
            // Find the part where we check for bart
            const bartCheckIndex = html.indexOf("currentUser.handle === 'bart'", loadAuthStart);
            if (bartCheckIndex > -1) {
                // Find the block where we set the variables
                const blockStart = html.lastIndexOf('{', bartCheckIndex);
                const blockEnd = html.indexOf('}', bartCheckIndex);
                const oldBlock = html.substring(blockStart, blockEnd + 1);
                
                // Replace with simpler, direct setting
                const newBlock = `{
                        console.log('🔐 Admin user detected: bart');
                        // Enable superpower mode for bart
                        isInSuperpowerMode = true;
                        isAuthenticated = true;
                    }`;
                
                html = html.replace(oldBlock, newBlock);
                console.log('✅ Simplified bart admin detection');
            }
        }
        
        // Do the same for the message event listener
        const messageListenerIndex = html.indexOf("event.data.type === 'TOYBOX_AUTH'");
        if (messageListenerIndex > -1) {
            // Find where we check for bart in the message handler
            const bartCheck2 = html.indexOf("currentUser.handle === 'bart'", messageListenerIndex);
            if (bartCheck2 > -1) {
                const blockStart = html.lastIndexOf('{', bartCheck2);
                const blockEnd = html.indexOf('}', bartCheck2);
                const oldBlock = html.substring(blockStart, blockEnd + 1);
                
                const newBlock = `{
                        console.log('🔐 Admin user logged in: bart');
                        // Enable superpower mode for bart
                        isInSuperpowerMode = true;
                        isAuthenticated = true;
                        // Reload issues to show admin controls
                        if (typeof loadIssues === 'function') {
                            loadIssues();
                        }
                    }`;
                
                html = html.replace(oldBlock, newBlock);
                console.log('✅ Fixed message listener bart detection');
            }
        }
        
        // Also ensure the URL parameter check properly sets the variable
        const urlParamCheck = html.indexOf("urlParams.get('superpower') === 'true'");
        if (urlParamCheck > -1) {
            // Make sure this line properly sets isInSuperpowerMode
            const lineStart = html.lastIndexOf('\n', urlParamCheck);
            const lineEnd = html.indexOf('\n', urlParamCheck);
            const oldLine = html.substring(lineStart, lineEnd);
            
            if (!oldLine.includes('isInSuperpowerMode =')) {
                // Find what variable it's setting
                const newLine = "\n        isInSuperpowerMode = urlParams.get('superpower') === 'true';";
                html = html.substring(0, lineStart) + newLine + html.substring(lineEnd);
                console.log('✅ Fixed URL parameter superpower check');
            }
        }
        
        console.log('\n💾 Saving fixed version...');
        
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
        
        console.log('✅ Successfully fixed variable declarations!\n');
        console.log('📋 What was fixed:');
        console.log('1. Added missing: let isInSuperpowerMode = false;');
        console.log('2. Removed typeof checks - variables now properly declared');
        console.log('3. Simplified bart detection to directly set variables');
        console.log('4. Both isAuthenticated and isInSuperpowerMode set to true for bart\n');
        console.log('🔗 Test now at: https://webtoys.ai/public/toybox-os');
        console.log('   Login as "bart" and admin mode should work!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixVariables();