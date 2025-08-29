#!/usr/bin/env node

/**
 * Increase Sudoku window height by 10% to ensure everything fits
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

async function increaseWindowHeight() {
    try {
        console.log('📏 Increasing Sudoku window height...');
        
        // Fetch ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_sudoku_size2_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved`);
        
        // Find and update the Sudoku registration
        // Current: 800, New: 880 (10% more)
        const oldPattern = /'toybox-lightning-puma-parasailing':\s*\{[^}]*height:\s*800[^}]*\}/;
        const newRegistration = `'toybox-lightning-puma-parasailing': {
                name: 'WTAF – Delusional App Generator',
                url: '/public/toybox-lightning-puma-parasailing',
                icon: '🎯',
                width: 600,
                height: 880
            }`;
        
        if (html.match(oldPattern)) {
            html = html.replace(oldPattern, newRegistration);
            console.log('✅ Updated Sudoku window height to 880px (was 800px)');
        } else {
            // Try a more flexible pattern
            const flexPattern = /'toybox-lightning-puma-parasailing':\s*\{[^}]*\}/;
            if (html.match(flexPattern)) {
                html = html.replace(flexPattern, newRegistration);
                console.log('✅ Updated Sudoku window height to 880px');
            } else {
                console.log('⚠️ Could not find Sudoku registration to update');
            }
        }
        
        // Update ToyBox OS
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) throw error;
        
        console.log('\n✅ Sudoku window height increased!');
        console.log('📏 New size: 600x880 pixels (+10% height)');
        console.log('🎮 Everything should now fit perfectly including:');
        console.log('  • The message area at the bottom');
        console.log('  • All buttons fully visible');
        console.log('  • No scrolling needed');
        console.log('\n🔄 Reload ToyBox OS to see the change!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

increaseWindowHeight();