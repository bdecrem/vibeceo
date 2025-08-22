#!/usr/bin/env node

/**
 * CAREFULLY fix only the profile icon clickability
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

async function fixProfileClickable() {
    try {
        console.log('🔧 Making profile icon clickable...');
        
        // First, BACKUP current working version
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        // Save backup FIRST
        const backupPath = path.join(__dirname, '..', 'backups', `toybox-os_before_clickfix_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxData.html_content);
        console.log(`💾 Backup saved to: ${backupPath}`);
        
        let html = toyboxData.html_content;
        
        // ONLY change: Make the toggleAuth function handle events properly
        // Find the existing toggleAuth function
        const toggleAuthPattern = /function toggleAuth\(\) \{/;
        
        if (html.match(toggleAuthPattern)) {
            // Change it to accept and stop event propagation
            html = html.replace(
                'function toggleAuth() {',
                'function toggleAuth(event) {\n        if (event) { event.stopPropagation(); }'
            );
            console.log('✅ Updated toggleAuth to handle events');
        }
        
        // Also update the onclick to pass event
        html = html.replace(
            'onclick="toggleAuth()"',
            'onclick="toggleAuth(event)"'
        );
        console.log('✅ Updated onclick to pass event');
        
        // Make profile icon smaller - just the font size
        html = html.replace(
            '#profile-icon {\n            cursor: pointer;\n            padding: 0 8px;\n            font-size: 16px;',
            '#profile-icon {\n            cursor: pointer;\n            padding: 0 8px;\n            font-size: 12px;'
        );
        
        // That's ALL we change - nothing else!
        
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
        
        console.log('✅ Profile icon should now be clickable!');
        console.log('🎯 Only changed: event handling and font size');
        console.log('💾 Backup saved in case anything breaks');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
fixProfileClickable();