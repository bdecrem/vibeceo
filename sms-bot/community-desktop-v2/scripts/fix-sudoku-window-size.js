#!/usr/bin/env node

/**
 * Fix Sudoku window size to show the full game
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

async function fixWindowSize() {
    try {
        console.log('📐 Fixing Sudoku window size...');
        
        // Fetch ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_sudoku_size_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved`);
        
        // Find the Sudoku app registration in windowedApps
        // The Sudoku game needs about 550px width and 750px height to show everything
        const sudokuPattern = /'toybox-lightning-puma-parasailing':\s*\{[^}]*\}/;
        const sudokuMatch = html.match(sudokuPattern);
        
        if (sudokuMatch) {
            const oldRegistration = sudokuMatch[0];
            const newRegistration = `'toybox-lightning-puma-parasailing': {
                name: 'WTAF – Delusional App Generator',
                url: '/public/toybox-lightning-puma-parasailing',
                icon: '🎯',
                width: 600,
                height: 800
            }`;
            
            html = html.replace(oldRegistration, newRegistration);
            console.log('✅ Updated Sudoku window size to 600x800');
        } else {
            console.log('⚠️ Could not find Sudoku registration');
            
            // Try to find it in windowedApps and add if missing
            if (html.includes('window.windowedApps = {')) {
                const registration = `
            'toybox-lightning-puma-parasailing': {
                name: 'Sudoku',
                url: '/public/toybox-lightning-puma-parasailing',
                icon: '🎯',
                width: 600,
                height: 800
            },`;
                
                html = html.replace(
                    'window.windowedApps = {',
                    `window.windowedApps = {${registration}`
                );
                console.log('✅ Added Sudoku with proper window size');
            }
        }
        
        // Also update the desktop icon label to just "Sudoku" if needed
        html = html.replace(
            /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('toybox-lightning-puma-parasailing'\)"[^>]*>[\s\S]*?<div class="label">[^<]*<\/div>/,
            `<div class="desktop-icon" onclick="openWindowedApp('toybox-lightning-puma-parasailing')">
                <div class="icon">🎯</div>
                <div class="label">Sudoku</div>`
        );
        
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
        
        console.log('\n✅ Sudoku window size fixed!');
        console.log('📐 New size: 600x800 pixels');
        console.log('🎮 This will show the full game including:');
        console.log('  • Title and stats');
        console.log('  • Complete 9x9 grid');
        console.log('  • Number buttons 1-9');
        console.log('  • All action buttons (Clear, Hint, Check, New Game)');
        console.log('  • Message area');
        console.log('\n🔄 Reload ToyBox OS to see the change!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixWindowSize();