#!/usr/bin/env node

/**
 * Fix profile icon for Safari - make it a proper clickable element
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

async function fixForSafari() {
    try {
        console.log('🔧 Fixing profile icon for Safari...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        // Save backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox-os_before_safari_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxData.html_content);
        console.log(`💾 Backup saved to: ${backupPath}`);
        
        let html = toyboxData.html_content;
        
        // Change the profile icon from div/span to a button for better Safari compatibility
        // Replace the profile icon HTML
        const oldProfileHTML = /<div id="profile-icon" onclick="toggleAuth\(event\)">/;
        const newProfileHTML = '<button id="profile-icon" onclick="toggleAuth(event)" style="border: none; background: transparent;">';
        
        if (html.match(oldProfileHTML)) {
            html = html.replace(oldProfileHTML, newProfileHTML);
            html = html.replace('</div>\n            <div id="menu-clock"', '</button>\n            <div id="menu-clock"');
            console.log('✅ Changed profile icon to button element');
        }
        
        // Also try with span if it's currently a span
        const oldProfileSpan = /<span id="profile-icon" onclick="toggleAuth\(event\)">/;
        if (html.match(oldProfileSpan)) {
            html = html.replace(oldProfileSpan, '<button id="profile-icon" onclick="toggleAuth(event)" style="border: none; background: transparent;">');
            html = html.replace('</span>\n            <div id="menu-clock"', '</button>\n            <div id="menu-clock"');
            console.log('✅ Changed profile icon from span to button element');
        }
        
        // Add button reset styles to the profile icon CSS
        html = html.replace(
            '#profile-icon {',
            '#profile-icon {\n            border: none;\n            background: transparent;\n            outline: none;'
        );
        
        // Make sure the function exists and works
        const functionCheck = /function toggleAuth\(event\)/;
        if (!html.match(functionCheck)) {
            console.log('⚠️ toggleAuth function not found with event parameter, adding it...');
            // Find any toggleAuth function and update it
            html = html.replace(
                /function toggleAuth\([^)]*\) \{/,
                'function toggleAuth(event) {\n        if (event) { event.preventDefault(); event.stopPropagation(); }'
            );
        } else {
            // Make sure it has preventDefault for Safari
            html = html.replace(
                'function toggleAuth(event) {\n        if (event) { event.stopPropagation(); }',
                'function toggleAuth(event) {\n        if (event) { event.preventDefault(); event.stopPropagation(); }'
            );
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('✅ Profile icon fixed for Safari!');
        console.log('🔘 Changed to button element for better compatibility');
        console.log('🎯 Added preventDefault for Safari event handling');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
fixForSafari();