#!/usr/bin/env node

/**
 * Verify and fix the Open button visibility
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function verifyOpenButton() {
    try {
        console.log('🔍 Verifying Open button in current HTML...\n');
        
        // Get current HTML from Supabase
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (fetchError) {
            console.error('❌ Error fetching from Supabase:', fetchError);
            return;
        }
        
        const html = current.html_content;
        console.log(`✓ Fetched HTML from Supabase (last updated: ${new Date(current.updated_at).toLocaleString()})`);
        
        // Check if components exist
        const hasOpenButtonStyle = html.includes('.open-button {');
        const hasOpenTicketFunction = html.includes('async function openTicket');
        const hasOpenButtonInDisplay = html.includes('Open Issue</button>');
        
        console.log('\n📋 Component Check:');
        console.log(`  ${hasOpenButtonStyle ? '✓' : '✗'} Open button CSS styles`);
        console.log(`  ${hasOpenTicketFunction ? '✓' : '✗'} openTicket function`);
        console.log(`  ${hasOpenButtonInDisplay ? '✓' : '✗'} Open button in display logic`);
        
        // Save current HTML for inspection
        const debugPath = path.join(__dirname, '..', 'debug-current-issue-tracker.html');
        await fs.writeFile(debugPath, html);
        console.log(`\n✓ Saved current HTML to: debug-current-issue-tracker.html`);
        
        // Check what loadRecentIssues function is actually called
        const hasLoadRecentIssues = html.includes('function loadRecentIssues()');
        const hasLoadRecentUpdates = html.includes('function loadRecentUpdates()');
        
        console.log('\n📋 Function Names:');
        console.log(`  ${hasLoadRecentIssues ? '✓' : '✗'} loadRecentIssues()`);
        console.log(`  ${hasLoadRecentUpdates ? '✓' : '✗'} loadRecentUpdates()`);
        
        if (hasLoadRecentUpdates && !hasLoadRecentIssues) {
            console.log('\n⚠️  Issue found: Function is called loadRecentUpdates, not loadRecentIssues');
            console.log('   The openTicket function might be calling the wrong function name!');
            
            // Fix the function call in openTicket
            if (hasOpenTicketFunction) {
                const fixedHtml = html.replace(
                    'loadRecentIssues();',
                    'loadRecentUpdates();'
                );
                
                // Update in Supabase
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: fixedHtml,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-issue-tracker');
                
                if (!updateError) {
                    console.log('\n✅ Fixed function call in openTicket!');
                    console.log('The Open button should now work properly.');
                }
            }
        }
        
        console.log('\n🔄 Refresh the page to see if the Open button appears:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

verifyOpenButton();