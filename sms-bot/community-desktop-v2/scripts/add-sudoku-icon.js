#!/usr/bin/env node

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

async function addSudokuIcon() {
    try {
        console.log('🎯 Adding Sudoku icon to desktop...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_sudoku_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Check if already exists
        if (html.includes('toybox-lightning-puma-parasailing')) {
            console.log('✅ Sudoku already on desktop');
            return;
        }
        
        // Add Sudoku icon
        const sudokuIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('toybox-lightning-puma-parasailing')">
                <div class="icon">🎯</div>
                <div class="label">Sudoku</div>
            </div>`;
        
        // Find last desktop icon and add after it
        const lastIconPattern = /<div class="desktop-icon"[\s\S]*?<\/div>\s*<\/div>(?![\s\S]*<div class="desktop-icon")/;
        const lastIcon = html.match(lastIconPattern);
        
        if (lastIcon) {
            const insertPoint = lastIcon.index + lastIcon[0].length;
            html = html.slice(0, insertPoint) + '\n' + sudokuIcon + html.slice(insertPoint);
            console.log('✅ Added Sudoku icon to desktop');
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
        
        console.log('\n✅ Sudoku added to desktop!');
        console.log('🎮 Direct URL: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
        console.log('🎯 Or reload ToyBox OS to see the Sudoku icon');
        
    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

addSudokuIcon();