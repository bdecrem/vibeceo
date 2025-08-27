#!/usr/bin/env node

/**
 * PROPERLY fix MEDIUM difficulty to actually remove more cells
 * 
 * The problem: createPuzzle() is hardcoded to remove 2 cells per row (18 total)
 * The fix: Make createPuzzle() actually use the difficulty setting
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure backups directory exists
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

async function createBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    const backupFile = path.join(backupDir, `sudoku_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    return backupFile;
}

async function properlyFixDifficulty() {
    console.log('🎮 PROPERLY fixing Sudoku difficulty levels...\n');
    
    // Fetch current Sudoku
    console.log('📥 Fetching current Sudoku game...');
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-lightning-puma-parasailing')
        .single();
    
    if (error) {
        console.error('❌ Failed to fetch:', error.message);
        return;
    }
    
    // Create backup
    await createBackup(data.html_content, 'Before properly fixing difficulty');
    
    let html = data.html_content;
    
    console.log('🔧 Replacing hardcoded createPuzzle with difficulty-aware version...');
    
    // Replace the entire createPuzzle function
    const newCreatePuzzle = `function createPuzzle() {
            const puzzle = JSON.parse(JSON.stringify(solution));
            
            // Calculate how many cells to remove based on difficulty
            let cellsToRemove;
            if (currentDifficulty === 'medium') {
                // MEDIUM: 45-50 cells removed (31-36 clues)
                cellsToRemove = 45 + Math.floor(Math.random() * 6);
            } else {
                // EASY: 30-35 cells removed (46-51 clues)
                cellsToRemove = 30 + Math.floor(Math.random() * 6);
            }
            
            console.log('Creating ' + currentDifficulty.toUpperCase() + ' puzzle, removing ' + cellsToRemove + ' cells');
            
            // Create array of all cell positions
            const allCells = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    allCells.push([r, c]);
                }
            }
            
            // Shuffle the array
            for (let i = allCells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
            }
            
            // Remove the specified number of cells
            for (let i = 0; i < cellsToRemove; i++) {
                const [row, col] = allCells[i];
                puzzle[row][col] = 0;
            }
            
            return puzzle;
        }`;
    
    // Find and replace the old createPuzzle function
    const oldCreatePuzzlePattern = /function createPuzzle\(\) \{[\s\S]*?return puzzle;\s*\}/;
    
    if (html.match(oldCreatePuzzlePattern)) {
        html = html.replace(oldCreatePuzzlePattern, newCreatePuzzle);
        console.log('✅ Replaced createPuzzle function');
    } else {
        console.error('❌ Could not find createPuzzle function');
        return;
    }
    
    // Also update the message to show the actual number of clues
    const messageUpdate = `showMessage('New ' + currentDifficulty.toUpperCase() + ' game started!', 'success');
            
            // Update empty count immediately after generating puzzle
            updateEmptyCount();`;
    
    // Replace the message line
    html = html.replace(
        /showMessage\('New ' \+ currentDifficulty\.toUpperCase\(\) \+ ' game started! \(' \+ \(81 - cellsToRemove\) \+ ' clues\)', 'success'\);/,
        messageUpdate
    );
    
    // Make sure currentDifficulty is properly initialized
    if (!html.includes("let currentDifficulty = 'easy';")) {
        // Add initialization after window.APP_ID
        html = html.replace(
            "window.APP_ID = 'sudoku-leaderboard';",
            "window.APP_ID = 'sudoku-leaderboard';\n        \n        // Track current difficulty\n        let currentDifficulty = 'easy';"
        );
    }
    
    // Save updated HTML
    console.log('\n📤 Updating Sudoku in database...');
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-lightning-puma-parasailing');
    
    if (updateError) {
        console.error('❌ Update failed:', updateError.message);
        return;
    }
    
    // Save locally too
    const outputFile = path.join(process.cwd(), 'sudoku-properly-fixed.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully fixed Sudoku difficulty!');
    console.log('📋 Actual difficulty levels now:');
    console.log('   - EASY: 30-35 cells removed (46-51 clues visible)');
    console.log('   - MEDIUM: 45-50 cells removed (31-36 clues visible)');
    console.log('   - Cells are now randomly distributed across the grid');
    console.log('   - Empty cell counter shows the actual difficulty');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the fix
properlyFixDifficulty().catch(console.error);