#!/usr/bin/env node

/**
 * Force fix - add Sudoku icon to desktop NOW
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

async function forceFixSudoku() {
    try {
        console.log('🔧 FORCE fixing Sudoku icon on desktop...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_sudoku_force_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved`);
        
        // Remove any existing Sudoku icon first
        html = html.replace(/<div class="desktop-icon"[^>]*onclick="openWindowedApp\('toybox-lightning-puma-parasailing'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
        
        // Add Sudoku icon - find where Chat icon is and add after it
        const sudokuIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('toybox-lightning-puma-parasailing')">
                <div class="icon">🎯</div>
                <div class="label">Sudoku</div>
            </div>`;
        
        // Find Chat icon and add Sudoku after it
        const chatPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('toybox-chat'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
        const chatMatch = html.match(chatPattern);
        
        if (chatMatch) {
            const insertPoint = chatMatch.index + chatMatch[0].length;
            html = html.slice(0, insertPoint) + '\n' + sudokuIcon + html.slice(insertPoint);
            console.log('✅ Added Sudoku icon after Chat');
        } else {
            // If no Chat, add after MacWord
            const macwordPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('macword'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
            const macwordMatch = html.match(macwordPattern);
            
            if (macwordMatch) {
                const insertPoint = macwordMatch.index + macwordMatch[0].length;
                html = html.slice(0, insertPoint) + '\n' + sudokuIcon + html.slice(insertPoint);
                console.log('✅ Added Sudoku icon after MacWord');
            } else {
                // Last resort - add after App Studio
                const appStudioPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('app-studio'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
                const appStudioMatch = html.match(appStudioPattern);
                
                if (appStudioMatch) {
                    const insertPoint = appStudioMatch.index + appStudioMatch[0].length;
                    html = html.slice(0, insertPoint) + '\n' + sudokuIcon + html.slice(insertPoint);
                    console.log('✅ Added Sudoku icon after App Studio');
                }
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
        
        console.log('\n🎯 SUDOKU ICON FIXED!');
        console.log('✅ Reload ToyBox OS now - Sudoku icon will be there!');
        console.log('\n📍 Or play directly at:');
        console.log('   https://webtoys.ai/public/toybox-lightning-puma-parasailing');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

forceFixSudoku();