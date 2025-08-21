#!/usr/bin/env node

/**
 * Fix the profile button to show modal when clicked while logged in
 * Should show profile screen with logout option
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

async function fixProfileClick() {
    try {
        console.log('🔧 Fixing profile button to always show modal...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        // Save backup first
        const backupPath = path.join(__dirname, '..', 'backups', `toybox-os_before_profile_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxData.html_content);
        console.log(`💾 Backup saved to: ${backupPath}`);
        
        let html = toyboxData.html_content;
        
        // The openAuthModal function needs to check login state and show appropriate screen
        // Find and update the openAuthModal function
        const improvedOpenAuth = `function openAuthModal() {
        document.getElementById('authModal').style.display = 'block';
        if (currentToyBoxUser) {
            // User is logged in, show profile screen
            showProfileScreen();
        } else {
            // User not logged in, show welcome screen
            showWelcomeScreen();
        }
    }`;
        
        // Replace the openAuthModal function
        html = html.replace(
            /function openAuthModal\(\) \{[^}]*\}/,
            improvedOpenAuth
        );
        
        // Make sure the profile screen shows the logged in user properly
        const improvedProfileScreen = `function showProfileScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('profileScreen').style.display = 'block';
        if (currentToyBoxUser) {
            document.getElementById('profileHandle').textContent = currentToyBoxUser.handle;
        }
    }`;
        
        // Replace showProfileScreen
        html = html.replace(
            /function showProfileScreen\(\) \{[^}]*\}/,
            improvedProfileScreen
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
        
        console.log('✅ Profile button fixed!');
        console.log('👤 Click on your name to see profile/logout options');
        console.log('🔄 Modal shows profile screen when logged in');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
fixProfileClick();