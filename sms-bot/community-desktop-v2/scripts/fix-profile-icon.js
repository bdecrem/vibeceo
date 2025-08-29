#!/usr/bin/env node

/**
 * Fix profile icon in ToyBox OS - make it smaller and clickable like Special menu
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function fixProfileIcon() {
    try {
        console.log('🔧 Fixing profile icon in ToyBox OS...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Fix the profile icon styles - make it smaller and properly styled
        html = html.replace(
            `#profile-icon {
            cursor: pointer;
            padding: 0 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 4px;
            user-select: none;
        }`,
            `#profile-icon {
            cursor: pointer;
            padding: 2px 6px;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 2px;
            user-select: none;
            font-family: Chicago, Geneva, sans-serif;
        }`
        );
        
        // Make the profile emoji smaller
        html = html.replace(
            `#profile-emoji {
            font-size: 16px;
        }`,
            `#profile-emoji {
            font-size: 12px;
        }`
        );
        
        // If profile-emoji style doesn't exist, add it
        if (!html.includes('#profile-emoji')) {
            html = html.replace(
                '#profile-icon:hover {',
                `#profile-emoji {
            font-size: 12px;
        }
        
        #profile-icon:hover {`
            );
        }
        
        // Fix the menu bar layout to properly align items
        html = html.replace(
            '<div id="profile-icon" onclick="toggleAuth()">',
            '<span id="profile-icon" onclick="toggleAuth(event)">'
        );
        
        html = html.replace(
            '</div>\n            <div id="menu-clock"',
            '</span>\n            <div id="menu-clock"'
        );
        
        // Update toggleAuth function to handle events properly like toggleSpecialMenu
        html = html.replace(
            'function toggleAuth() {',
            'function toggleAuth(event) {\n        if (event) event.stopPropagation();'
        );
        
        // Also add menu-right styling if missing
        if (!html.includes('.menu-right {')) {
            html = html.replace(
                '.menu-bar {',
                `.menu-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .menu-bar {`
            );
        }
        
        // Make sure the profile icon is in a proper container
        html = html.replace(
            /<div class="menu-right">\s*<span id="profile-icon"/,
            '<div class="menu-right">\n            <span id="profile-icon"'
        );
        
        // Ensure proper event handling
        const toggleAuthFixed = `function toggleAuth(event) {
        if (event) event.stopPropagation();
        const modal = document.getElementById('authModal');
        if (modal.classList.contains('active')) {
            closeAuth();
        } else {
            modal.classList.add('active');
            if (currentUser) {
                showScreen('profileScreen');
                document.getElementById('profileHandle').textContent = currentUser.handle;
            } else {
                showScreen('welcomeScreen');
            }
        }
    }`;
        
        // Replace the toggleAuth function
        html = html.replace(
            /function toggleAuth\([^)]*\) \{[^}]+\}/,
            toggleAuthFixed
        );
        
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
        
        console.log('✅ Profile icon fixed!');
        console.log('👤 Icon is now smaller and properly clickable');
        console.log('🎯 Uses same event handling as Special menu');
        
    } catch (error) {
        console.error('❌ Failed to fix profile icon:', error);
        process.exit(1);
    }
}

// Run
fixProfileIcon();