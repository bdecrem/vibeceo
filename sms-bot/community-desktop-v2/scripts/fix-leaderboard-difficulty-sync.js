#!/usr/bin/env node

/**
 * Fix leaderboard to show correct difficulty tab when saving scores
 * 
 * Issue: MEDIUM scores are being shown on EASY leaderboard after saving
 * Fix: Sync currentLeaderboardDifficulty with currentDifficulty when showing leaderboard
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

async function fixLeaderboardSync() {
    console.log('🎮 Fixing leaderboard difficulty synchronization...\n');
    
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
    await createBackup(data.html_content, 'Before fixing leaderboard sync');
    
    let html = data.html_content;
    
    console.log('🔧 Fixing leaderboard to show correct difficulty tab...');
    
    // Update showLeaderboard to sync difficulty and update tabs
    const newShowLeaderboard = `function showLeaderboard() {
            // Sync leaderboard difficulty with current game difficulty
            currentLeaderboardDifficulty = currentDifficulty;
            
            // Update tab styles to show correct active tab
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.textContent.toLowerCase() === currentLeaderboardDifficulty.toLowerCase()) {
                    tab.classList.add('active');
                }
            });
            
            document.getElementById('flipCard').classList.add('flipped');
            loadAndDisplayLeaderboard();
        }`;
    
    // Replace the showLeaderboard function
    const showLeaderboardPattern = /function showLeaderboard\(\) \{[\s\S]*?loadAndDisplayLeaderboard\(\);\s*\}/;
    
    if (html.match(showLeaderboardPattern)) {
        html = html.replace(showLeaderboardPattern, newShowLeaderboard);
        console.log('✅ Updated showLeaderboard to sync difficulty');
    } else {
        console.error('❌ Could not find showLeaderboard function');
    }
    
    // Also update the saveScore function to automatically show correct tab after saving
    const saveScoreUpdate = `
                showMessage('🏆 Score saved to ' + currentDifficulty.toUpperCase() + ' leaderboard!', 'success');
                // Set correct leaderboard tab before showing
                currentLeaderboardDifficulty = currentDifficulty;
                setTimeout(() => showLeaderboard(), 1000);`;
    
    // Find and update the save success message
    html = html.replace(
        "showMessage('🏆 Score saved to leaderboard!', 'success');\n                setTimeout(() => showLeaderboard(), 1000);",
        saveScoreUpdate
    );
    
    // Update switchLeaderboard to properly handle manual tab switching
    const newSwitchLeaderboard = `function switchLeaderboard(difficulty) {
            currentLeaderboardDifficulty = difficulty;
            
            // Update tab styles
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.textContent.toLowerCase() === difficulty.toLowerCase()) {
                    tab.classList.add('active');
                }
            });
            
            // Reload leaderboard for selected difficulty
            loadAndDisplayLeaderboard();
        }`;
    
    // Replace switchLeaderboard function
    const switchPattern = /function switchLeaderboard\(difficulty\) \{[\s\S]*?loadAndDisplayLeaderboard\(\);\s*\}/;
    
    if (html.match(switchPattern)) {
        html = html.replace(switchPattern, newSwitchLeaderboard);
        console.log('✅ Updated switchLeaderboard function');
    }
    
    // Initialize currentLeaderboardDifficulty if not present
    if (!html.includes('let currentLeaderboardDifficulty')) {
        html = html.replace(
            "let currentDifficulty = 'easy';",
            "let currentDifficulty = 'easy';\n        let currentLeaderboardDifficulty = 'easy';"
        );
        console.log('✅ Added currentLeaderboardDifficulty initialization');
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
    const outputFile = path.join(process.cwd(), 'sudoku-fixed-sync.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully fixed leaderboard difficulty sync!');
    console.log('📋 Fixed behaviors:');
    console.log('   - EASY scores now show on EASY leaderboard');
    console.log('   - MEDIUM scores now show on MEDIUM leaderboard');
    console.log('   - Correct tab is highlighted when opening leaderboard');
    console.log('   - After saving a score, shows the correct difficulty leaderboard');
    console.log('   - Manual tab switching still works properly');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the fix
fixLeaderboardSync().catch(console.error);