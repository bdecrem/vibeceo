#!/usr/bin/env node

/**
 * Adjust Sudoku difficulty to reasonable levels
 * 
 * EASY: 18 cells removed (63 clues visible)
 * MEDIUM: 30 cells removed (51 clues visible)
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

async function adjustDifficulty() {
    console.log('🎮 Adjusting Sudoku difficulty to reasonable levels...\n');
    
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
    await createBackup(data.html_content, 'Before adjusting difficulty to reasonable levels');
    
    let html = data.html_content;
    
    console.log('🔧 Adjusting difficulty levels in createPuzzle...');
    
    // Replace the createPuzzle function with reasonable difficulty
    const newCreatePuzzle = `function createPuzzle() {
            const puzzle = JSON.parse(JSON.stringify(solution));
            
            // More reasonable difficulty levels
            let cellsToRemove;
            if (currentDifficulty === 'medium') {
                // MEDIUM: 30 cells removed (51 clues visible)
                cellsToRemove = 30;
            } else {
                // EASY: 18 cells removed (63 clues visible)
                cellsToRemove = 18;
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
    
    // Find and replace the createPuzzle function
    const createPuzzlePattern = /function createPuzzle\(\) \{[\s\S]*?return puzzle;\s*\}/;
    
    if (html.match(createPuzzlePattern)) {
        html = html.replace(createPuzzlePattern, newCreatePuzzle);
        console.log('✅ Updated createPuzzle with reasonable difficulty levels');
    } else {
        console.error('❌ Could not find createPuzzle function');
        return;
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
    const outputFile = path.join(process.cwd(), 'sudoku-reasonable-difficulty.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully adjusted Sudoku difficulty!');
    console.log('📋 New difficulty levels:');
    console.log('   - EASY: 18 cells removed (63 clues visible) - Great for beginners');
    console.log('   - MEDIUM: 30 cells removed (51 clues visible) - Good challenge');
    console.log('   - Still has difficulty selection modal');
    console.log('   - Still has separate leaderboards for each level');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the adjustment
adjustDifficulty().catch(console.error);