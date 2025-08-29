#!/usr/bin/env node

/**
 * Fix Sudoku leaderboard to properly display scores and rankings
 * 
 * The issue: scores are stored in content_data but being accessed directly
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

async function fixLeaderboard() {
    console.log('🏆 Fixing Sudoku leaderboard display...\n');
    
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
    await createBackup(data.html_content, 'Before fixing leaderboard');
    
    let html = data.html_content;
    
    console.log('🔧 Fixing leaderboard display logic...');
    
    // Fix the loadAndDisplayLeaderboard function to properly access content_data
    const newLoadAndDisplayLeaderboard = `async function loadAndDisplayLeaderboard() {
            const scores = await loadScores();
            
            // Filter by current difficulty
            const filteredScores = scores.filter(s => {
                const scoreData = s.content_data || s;
                return scoreData.difficulty === currentLeaderboardDifficulty || 
                    (!scoreData.difficulty && currentLeaderboardDifficulty === 'easy'); // Legacy scores count as easy
            });
            
            // Sort by score descending (higher score is better)
            filteredScores.sort((a, b) => {
                const scoreA = (a.content_data || a).score || 0;
                const scoreB = (b.content_data || b).score || 0;
                return scoreB - scoreA;
            });
            
            // Take top 10
            const topScores = filteredScores.slice(0, 10);
            
            const listEl = document.getElementById('leaderboardList');
            
            if (topScores.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No scores yet. Be the first!</div>';
                return;
            }
            
            listEl.innerHTML = topScores.map((score, index) => {
                const scoreData = score.content_data || score;
                const rank = index + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'gold';
                else if (rank === 2) rankClass = 'silver';
                else if (rank === 3) rankClass = 'bronze';
                
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
                
                // Format time nicely
                const timeStr = scoreData.time || '0:00';
                const hintsStr = scoreData.hints || 0;
                const errorsStr = scoreData.errors || 0;
                
                return \`
                    <div class="leaderboard-entry \${rankClass}">
                        <div class="leaderboard-rank">\${medal}</div>
                        <div class="leaderboard-name">\${scoreData.initials || 'AAA'}</div>
                        <div class="leaderboard-score">\${scoreData.score || 0}</div>
                    </div>
                    <div class="leaderboard-details">
                        Time: \${timeStr} | Hints: \${hintsStr} | Errors: \${errorsStr}
                    </div>
                \`;
            }).join('');
        }`;
    
    // Replace the loadAndDisplayLeaderboard function
    const loadAndDisplayPattern = /async function loadAndDisplayLeaderboard\(\) \{[\s\S]*?\n        \}/;
    
    if (html.match(loadAndDisplayPattern)) {
        html = html.replace(loadAndDisplayPattern, newLoadAndDisplayLeaderboard);
        console.log('✅ Fixed loadAndDisplayLeaderboard function');
    } else {
        console.error('❌ Could not find loadAndDisplayLeaderboard function');
    }
    
    // Also ensure currentLeaderboardDifficulty is initialized
    if (!html.includes('let currentLeaderboardDifficulty')) {
        html = html.replace(
            "let currentDifficulty = 'easy';",
            "let currentDifficulty = 'easy';\n        let currentLeaderboardDifficulty = 'easy';"
        );
        console.log('✅ Added currentLeaderboardDifficulty initialization');
    }
    
    // Fix the save score function to ensure it's saving correctly
    const saveScorePattern = /async function saveScore\(\) \{[\s\S]*?\n        \}/;
    
    if (html.match(saveScorePattern)) {
        // Check if save is correctly structured
        if (!html.includes('content_data: scoreData')) {
            console.log('⚠️  Save function may need adjustment');
        }
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
    const outputFile = path.join(process.cwd(), 'sudoku-fixed-leaderboard.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully fixed Sudoku leaderboard!');
    console.log('📋 Leaderboard now:');
    console.log('   - Properly displays scores with rankings');
    console.log('   - Shows gold/silver/bronze medals for top 3');
    console.log('   - Displays initials, score, time, hints, and errors');
    console.log('   - Filters correctly by difficulty (EASY/MEDIUM tabs)');
    console.log('   - Legacy scores appear in EASY leaderboard');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the fix
fixLeaderboard().catch(console.error);