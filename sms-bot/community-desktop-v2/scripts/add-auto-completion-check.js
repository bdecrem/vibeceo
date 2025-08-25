#!/usr/bin/env node

/**
 * Add auto-completion detection - when empty cells = 0, check solution automatically
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

async function addAutoCompletion() {
    try {
        console.log('🎯 Adding auto-completion detection to Sudoku...');
        
        // Fetch current Sudoku
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        let html = data.html_content;
        
        // Backup current state
        const backupPath = path.join(__dirname, '..', 'backups', `sudoku_before_auto_complete_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backed up current state`);
        
        // Modify the updateEmptyCount function to auto-check when complete
        html = html.replace(
            `function updateEmptyCount() {
            let count = 0;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (userGrid[row][col] === 0) count++;
                }
            }
            document.getElementById('emptyCount').textContent = count;
        }`,
            `function updateEmptyCount() {
            let count = 0;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (userGrid[row][col] === 0) count++;
                }
            }
            document.getElementById('emptyCount').textContent = count;
            
            // Auto-check when puzzle is complete (no empty cells)
            if (count === 0 && !window.isChecking) {
                window.isChecking = true;
                setTimeout(() => {
                    checkSolution();
                    window.isChecking = false;
                }, 100);
            }
        }`
        );
        
        // Also update the giveHint function to remove the manual check since updateEmptyCount will handle it
        html = html.replace(
            `// Check if complete
            if (isComplete()) {
                checkSolution();
            }
            
            updateEmptyCount();`,
            `// updateEmptyCount will auto-check if complete
            updateEmptyCount();`
        );
        
        // Update the database
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing');
        
        if (error) throw error;
        
        console.log('✅ Auto-completion detection added!');
        console.log('\n🎮 How it works:');
        console.log('  • When empty cells reach 0, solution is checked automatically');
        console.log('  • If correct: prompts for nickname → saves to leaderboard');
        console.log('  • If incorrect: shows error message as before');
        console.log('  • No other changes to layout or game mechanics');
        console.log('\n🔄 Reload the game to test the auto-completion!');
        
    } catch (error) {
        console.error('❌ Failed to add auto-completion:', error);
        process.exit(1);
    }
}

addAutoCompletion();