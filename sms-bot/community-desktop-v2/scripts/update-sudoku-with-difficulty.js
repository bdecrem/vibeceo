#!/usr/bin/env node

/**
 * Update Sudoku with difficulty selection and tabbed leaderboards
 * 
 * This script adds:
 * 1. Difficulty selection modal when clicking New Game
 * 2. Tabbed leaderboards for EASY and MEDIUM difficulties
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

async function updateSudoku() {
    console.log('🎮 Updating Sudoku with difficulty features...\n');
    
    // Fetch current Sudoku
    console.log('📥 Fetching Sudoku game...');
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
    await createBackup(data.html_content, 'Before adding difficulty features');
    
    let html = data.html_content;
    
    // 1. Add styles for difficulty modal and tabs
    console.log('🎨 Adding styles for difficulty modal and leaderboard tabs...');
    
    const additionalStyles = `
        /* Difficulty Modal */
        .difficulty-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }
        
        .difficulty-modal.show {
            display: flex;
        }
        
        .difficulty-content {
            background: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .difficulty-title {
            font-size: 24px;
            font-weight: 700;
            color: #333;
            margin-bottom: 20px;
        }
        
        .difficulty-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .btn-difficulty {
            padding: 15px 30px;
            font-size: 18px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-easy {
            background: #4caf50;
            color: white;
        }
        
        .btn-easy:hover {
            background: #45a049;
            transform: scale(1.05);
        }
        
        .btn-medium {
            background: #ff9800;
            color: white;
        }
        
        .btn-medium:hover {
            background: #fb8c00;
            transform: scale(1.05);
        }
        
        /* Leaderboard Tabs */
        .leaderboard-tabs {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 20px;
        }
        
        .leaderboard-tab {
            padding: 10px 20px;
            background: #e0e0e0;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .leaderboard-tab.active {
            background: #9c27b0;
            color: white;
        }
        
        .leaderboard-tab:hover:not(.active) {
            background: #d0d0d0;
        }`;
    
    // Insert styles before closing </style> tag
    html = html.replace('</style>', additionalStyles + '\n    </style>');
    
    // 2. Add difficulty modal HTML
    console.log('📝 Adding difficulty selection modal...');
    
    const difficultyModal = `
    <!-- Difficulty Selection Modal -->
    <div id="difficultyModal" class="difficulty-modal">
        <div class="difficulty-content">
            <div class="difficulty-title">Select Difficulty</div>
            <div class="difficulty-buttons">
                <button class="btn-difficulty btn-easy" onclick="startNewGame('easy')">EASY</button>
                <button class="btn-difficulty btn-medium" onclick="startNewGame('medium')">MEDIUM</button>
            </div>
        </div>
    </div>`;
    
    // Add modal after the initials modal
    html = html.replace('</div>\n    </div>\n\n    <script>', '</div>\n    </div>\n\n' + difficultyModal + '\n\n    <script>');
    
    // 3. Update leaderboard HTML to include tabs
    console.log('📊 Adding leaderboard tabs...');
    
    const leaderboardHTML = `                <div class="leaderboard-container">
                    <div class="leaderboard-header">
                        <div class="leaderboard-title">🏆 Leaderboard</div>
                        <div class="leaderboard-tabs">
                            <button class="leaderboard-tab active" onclick="switchLeaderboard('easy')">EASY</button>
                            <button class="leaderboard-tab" onclick="switchLeaderboard('medium')">MEDIUM</button>
                        </div>
                    </div>
                    <div class="leaderboard-list" id="leaderboardList">
                        <div style="text-align: center; color: #666; padding: 40px;">
                            No scores yet. Be the first!
                        </div>
                    </div>`;
    
    // Replace the leaderboard container
    html = html.replace(/<div class="leaderboard-container">[\s\S]*?<div class="leaderboard-list" id="leaderboardList">[\s\S]*?<\/div>\s*<\/div>/, leaderboardHTML + '\n                </div>');
    
    // 4. Update JavaScript functions
    console.log('🔧 Updating game logic...');
    
    // Add current difficulty tracking
    const difficultyTracking = `
        // Track current difficulty
        let currentDifficulty = 'easy';
        let currentLeaderboardDifficulty = 'easy';`;
    
    // Insert after window.APP_ID line
    html = html.replace("window.APP_ID = 'sudoku-leaderboard';", "window.APP_ID = 'sudoku-leaderboard';" + difficultyTracking);
    
    // Update newGame function to show modal
    html = html.replace(
        'function newGame() {',
        `function newGame() {
            // Show difficulty selection modal
            document.getElementById('difficultyModal').classList.add('show');
        }
        
        function startNewGame(difficulty) {
            // Hide modal
            document.getElementById('difficultyModal').classList.remove('show');
            currentDifficulty = difficulty;
            
            // Original newGame logic with difficulty`
    );
    
    // Fix the newGame function closing
    html = html.replace(
        "showMessage('New game started! Good luck!', 'success');\n        }",
        `showMessage('New game started! Difficulty: ' + difficulty.toUpperCase(), 'success');
        }`
    );
    
    // Add switchLeaderboard function
    const switchLeaderboardFunc = `
        function switchLeaderboard(difficulty) {
            currentLeaderboardDifficulty = difficulty;
            
            // Update tab styles
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Reload leaderboard for selected difficulty
            loadAndDisplayLeaderboard();
        }`;
    
    // Insert before loadAndDisplayLeaderboard function
    html = html.replace('async function loadAndDisplayLeaderboard()', switchLeaderboardFunc + '\n\n        async function loadAndDisplayLeaderboard()');
    
    // Update save score to include difficulty
    html = html.replace(
        'initials: initials,\n                score: finalScore,',
        'initials: initials,\n                score: finalScore,\n                difficulty: currentDifficulty,'
    );
    
    // Update load scores to filter by difficulty
    html = html.replace(
        "const response = await fetch(`/api/zad/load?app_id=${window.APP_ID}&action_type=leaderboard_score`);",
        "const response = await fetch(`/api/zad/load?app_id=${window.APP_ID}&action_type=leaderboard_score`);"
    );
    
    // Add difficulty filtering in loadAndDisplayLeaderboard
    html = html.replace(
        'const scores = await loadScores();\n            \n            // Sort by score',
        `const scores = await loadScores();
            
            // Filter by current difficulty
            const filteredScores = scores.filter(s => 
                s.content_data.difficulty === currentLeaderboardDifficulty || 
                (!s.content_data.difficulty && currentLeaderboardDifficulty === 'easy') // Legacy scores count as easy
            );
            
            // Sort by score`
    );
    
    html = html.replace(
        'scores.sort((a, b)',
        'filteredScores.sort((a, b)'
    );
    
    html = html.replace(
        'const topScores = scores.slice(0, 10);',
        'const topScores = filteredScores.slice(0, 10);'
    );
    
    // Update generatePuzzle to use difficulty
    html = html.replace(
        'function generatePuzzle() {',
        `function generatePuzzle() {
            // Adjust cells to remove based on difficulty
            const cellsToRemove = currentDifficulty === 'medium' ? 45 : 35; // Easy: 35, Medium: 45`
    );
    
    // Replace the hardcoded 35 with cellsToRemove
    html = html.replace(
        'for (let i = 0; i < 35; i++) {',
        'for (let i = 0; i < cellsToRemove; i++) {'
    );
    
    // 5. Save updated HTML
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
    const outputFile = path.join(process.cwd(), 'sudoku-updated.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully updated Sudoku!');
    console.log('📋 New features:');
    console.log('   - Difficulty selection when clicking New Game (EASY/MEDIUM)');
    console.log('   - EASY: 35 cells removed');
    console.log('   - MEDIUM: 45 cells removed');
    console.log('   - Separate leaderboards with tabs for each difficulty');
    console.log('   - Legacy scores appear in EASY leaderboard');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
}

// Run the update
updateSudoku().catch(console.error);