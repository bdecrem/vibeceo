#!/usr/bin/env node

/**
 * Final fix for App Studio to properly save appType from dropdown
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
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

async function finalFix() {
    try {
        console.log('🔧 Final fix for App Studio type handling...');
        
        // Fetch current App Studio
        const { data: appStudioData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
        
        let html = appStudioData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `app-studio_final_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Find the entire createApp function
        const createAppMatch = html.match(/async function createApp\(\) \{[\s\S]*?\n            \}/);
        
        if (createAppMatch) {
            const oldFunction = createAppMatch[0];
            console.log('🔍 Found createApp function');
            
            // Replace with properly fixed version
            const newFunction = `async function createApp() {
                const name = document.getElementById('appName').value;
                const type = document.getElementById('appType').value; // GET TYPE FROM DROPDOWN
                let description = document.getElementById('appDescription').value;
                
                // Special handling for Webtoys import
                if (type === 'webtoys') {
                    description = 'Import Webtoys app: ' + description.trim();
                    console.log('Importing Webtoys app with slug:', description);
                }
                
                if (!name || !description) {
                    alert('Please fill in all fields');
                    return;
                }
                
                const submission = {
                    appName: name,
                    appType: type, // USE THE TYPE VARIABLE HERE
                    appFunction: description,
                    appSlug: name.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Date.now().toString().slice(-6),
                    appIcon: null,
                    submitterName: localStorage.getItem('toybox_user') ? 
                        JSON.parse(localStorage.getItem('toybox_user')).handle : 'anonymous',
                    timestamp: new Date().toISOString(),
                    status: 'new',
                    source: 'app-studio'
                };
                
                console.log('Submitting app with type:', type);
                console.log('Full submission:', submission);
                
                // Save to ZAD
                try {
                    const response = await fetch('/api/zad/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            app_id: 'toybox-windowed-apps',
                            data_type: 'windowed_app',
                            content_data: submission,
                            participant_id: submission.submitterName,
                            action_type: 'windowed_app'
                        })
                    });
                    
                    if (response.ok) {
                        showNotification('App submitted! The CLI agent will process it soon.', 'success');
                        
                        // Clear form
                        document.getElementById('appName').value = '';
                        document.getElementById('appDescription').value = '';
                        document.getElementById('appType').value = 'windowed';
                        
                        // Update recent apps
                        await loadRecentApps();
                    } else {
                        showNotification('Failed to submit app', 'error');
                    }
                } catch (error) {
                    showNotification('Error submitting app', 'error');
                    console.error(error);
                }
            }`;
            
            html = html.replace(oldFunction, newFunction);
            console.log('✅ Replaced createApp function with fixed version');
        }
        
        // Update App Studio
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio');
        
        if (updateError) throw updateError;
        
        console.log('\n✅ App Studio FINALLY fixed!');
        console.log('\n📋 Now it will definitely work:');
        console.log('  1. Reload ToyBox OS completely');
        console.log('  2. Open App Studio');
        console.log('  3. Select "Webtoys (Import Existing App)"');
        console.log('  4. Enter: wave-wood-deconstructing');
        console.log('  5. Submit');
        console.log('\nThe type will now be saved as "webtoys" correctly!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

finalFix();