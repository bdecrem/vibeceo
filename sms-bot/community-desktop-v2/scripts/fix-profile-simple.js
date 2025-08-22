#!/usr/bin/env node

/**
 * Just make a simple working button - no fancy stuff
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

async function makeSimpleButton() {
    try {
        console.log('🔧 Making a SIMPLE clickable button...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Find where the menu-clock is and add a simple button before it
        // Remove any existing profile-icon first
        html = html.replace(/<button id="profile-icon"[^>]*>[\s\S]*?<\/button>\s*/g, '');
        html = html.replace(/<div id="profile-icon"[^>]*>[\s\S]*?<\/div>\s*/g, '');
        html = html.replace(/<span id="profile-icon"[^>]*>[\s\S]*?<\/span>\s*/g, '');
        
        // Add a dead simple button before the clock
        const simpleButton = `<button onclick="alert('Login clicked! Modal would open here.')" style="border: none; background: transparent; cursor: pointer; padding: 4px; font-size: 12px;">👤</button>
            `;
        
        html = html.replace(
            '<div id="menu-clock"',
            simpleButton + '<div id="menu-clock"'
        );
        
        console.log('✅ Added simple test button with alert');
        
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
        
        console.log('✅ Done! Simple button added.');
        console.log('🎯 It just shows an alert when clicked.');
        console.log('📱 If this works, we know buttons work and can build from there.');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
makeSimpleButton();