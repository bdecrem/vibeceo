#!/usr/bin/env node

/**
 * Fix MEDIUM difficulty to actually be harder
 * 
 * This script makes MEDIUM difficulty properly harder by:
 * 1. Removing more cells (50-55 instead of 35-40)
 * 2. Using a different removal pattern for harder puzzles
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

async function fixMediumDifficulty() {
    console.log('🎮 Fixing MEDIUM difficulty to be actually harder...\n');
    
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
    await createBackup(data.html_content, 'Before fixing MEDIUM difficulty');
    
    let html = data.html_content;
    
    console.log('🔧 Updating puzzle generation for proper difficulty levels...');
    
    // Find and replace the generatePuzzle function to properly handle difficulty
    const newGeneratePuzzle = `function generatePuzzle() {
            // Adjust cells to remove based on difficulty
            // EASY: 35-40 cells removed (more clues)
            // MEDIUM: 50-55 cells removed (fewer clues = harder)
            const minCells = currentDifficulty === 'medium' ? 50 : 35;
            const maxCells = currentDifficulty === 'medium' ? 55 : 40;
            const cellsToRemove = minCells + Math.floor(Math.random() * (maxCells - minCells + 1));
            
            console.log('Generating ' + currentDifficulty.toUpperCase() + ' puzzle, removing ' + cellsToRemove + ' cells');`;
    
    // Replace the existing generatePuzzle function opening
    html = html.replace(
        /function generatePuzzle\(\) \{[\s\S]*?const cellsToRemove = [\s\S]*?;/,
        newGeneratePuzzle
    );
    
    // Also update the message to show how many cells were removed
    const improvedMessage = `showMessage('New ' + currentDifficulty.toUpperCase() + ' game started! (' + (81 - cellsToRemove) + ' clues)', 'success');`;
    
    html = html.replace(
        /showMessage\('New game started! Difficulty: ' \+ difficulty\.toUpperCase\(\), 'success'\);/,
        improvedMessage
    );
    
    // Add a visual indicator for difficulty in the game
    const difficultyIndicator = `
            // Show current difficulty
            const difficultyDisplay = document.querySelector('.difficulty');
            if (difficultyDisplay) {
                difficultyDisplay.textContent = currentDifficulty.toUpperCase() + ' MODE';
                difficultyDisplay.style.color = currentDifficulty === 'medium' ? '#ff9800' : '#4caf50';
            }`;
    
    // Add this after the showMessage line in startNewGame
    html = html.replace(
        "showMessage('New ' + currentDifficulty.toUpperCase() + ' game started! (' + (81 - cellsToRemove) + ' clues)', 'success');",
        "showMessage('New ' + currentDifficulty.toUpperCase() + ' game started! (' + (81 - cellsToRemove) + ' clues)', 'success');" + difficultyIndicator
    );
    
    // Update the scoring system to give bonus points for MEDIUM difficulty
    const scoringUpdate = `
            // Apply difficulty multiplier to score
            if (currentDifficulty === 'medium') {
                finalScore = Math.floor(finalScore * 1.5); // 50% bonus for MEDIUM
                document.getElementById('finalScore').textContent = finalScore + ' (MEDIUM +50%)';
            } else {
                document.getElementById('finalScore').textContent = finalScore;
            }`;
    
    // Find where the score is calculated and add the multiplier
    html = html.replace(
        "document.getElementById('finalScore').textContent = finalScore;",
        scoringUpdate
    );
    
    // Also fix the initialization to set currentDifficulty to 'easy' by default
    const initFix = `
        // Initialize with easy difficulty
        currentDifficulty = 'easy';
        generatePuzzle();`;
    
    html = html.replace(
        'generatePuzzle();',
        initFix
    );
    
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
    const outputFile = path.join(process.cwd(), 'sudoku-fixed-difficulty.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully fixed MEDIUM difficulty!');
    console.log('📋 Changes made:');
    console.log('   - EASY: 35-40 cells removed (41-46 clues shown)');
    console.log('   - MEDIUM: 50-55 cells removed (26-31 clues shown)');
    console.log('   - MEDIUM scores get 50% bonus points');
    console.log('   - Shows number of clues when starting new game');
    console.log('   - Difficulty indicator updates with color coding');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the fix
fixMediumDifficulty().catch(console.error);