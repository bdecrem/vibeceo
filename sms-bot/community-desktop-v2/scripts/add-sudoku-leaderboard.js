#!/usr/bin/env node

/**
 * Add leaderboard with flip animation to Sudoku game
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function addLeaderboard() {
    try {
        console.log('🏆 Adding leaderboard to Sudoku...');
        
        // Fetch current Sudoku game
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        let html = data.html_content;
        
        // Add flip animation and leaderboard styles
        const leaderboardStyles = `
        /* Flip card container */
        .flip-container {
            perspective: 1000px;
            width: 100%;
            height: 100%;
            position: relative;
        }
        
        .flip-card {
            width: 100%;
            height: 100%;
            position: relative;
            transition: transform 0.8s;
            transform-style: preserve-3d;
        }
        
        .flip-card.flipped {
            transform: rotateY(180deg);
        }
        
        .flip-front, .flip-back {
            width: 100%;
            height: 100%;
            position: absolute;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
        }
        
        .flip-back {
            transform: rotateY(180deg);
            background: white;
            border-radius: 12px;
            padding: 20px;
        }
        
        .btn-leaderboard {
            background: #9c27b0;
            color: white;
        }
        
        .btn-leaderboard:hover {
            background: #7b1fa2;
        }
        
        .leaderboard-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .leaderboard-header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .leaderboard-title {
            font-size: 28px;
            font-weight: 700;
            color: #333;
            margin-bottom: 10px;
        }
        
        .leaderboard-list {
            flex: 1;
            overflow-y: auto;
            background: #f5f5f5;
            border-radius: 8px;
            padding: 15px;
        }
        
        .leaderboard-entry {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: white;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .leaderboard-entry.gold {
            background: linear-gradient(135deg, #ffd700, #ffed4e);
        }
        
        .leaderboard-entry.silver {
            background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
        }
        
        .leaderboard-entry.bronze {
            background: linear-gradient(135deg, #cd7f32, #e4a853);
        }
        
        .leaderboard-rank {
            font-size: 20px;
            font-weight: 700;
            width: 40px;
        }
        
        .leaderboard-name {
            flex: 1;
            font-size: 18px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 0 15px;
        }
        
        .leaderboard-score {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
        }
        
        .leaderboard-details {
            font-size: 12px;
            color: #666;
            margin-left: 55px;
        }
        
        .back-button {
            margin-top: 20px;
            width: 100%;
            padding: 12px;
            font-size: 18px;
            font-weight: 600;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
        
        .back-button:hover {
            background: #5a67d8;
        }
        
        .initials-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1000;
        }
        
        .initials-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .initials-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #4caf50;
        }
        
        .initials-score {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 20px;
        }
        
        .initials-input {
            font-size: 24px;
            padding: 10px;
            width: 120px;
            text-align: center;
            text-transform: uppercase;
            border: 2px solid #667eea;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .initials-submit {
            padding: 10px 30px;
            font-size: 18px;
            font-weight: 600;
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
        
        .initials-submit:hover {
            background: #45a049;
        }`;
        
        // Add styles before </style>
        html = html.replace('</style>', leaderboardStyles + '\n    </style>');
        
        // Wrap the game container in flip card
        html = html.replace(
            '<div class="game-container">',
            `<div class="flip-container">
        <div class="flip-card" id="flipCard">
            <div class="flip-front">
                <div class="game-container">`
        );
        
        // Close the flip-front div and add flip-back with leaderboard
        html = html.replace(
            '</div>\n\n    <script>',
            `</div>
            </div>
            <div class="flip-back">
                <div class="leaderboard-container">
                    <div class="leaderboard-header">
                        <div class="leaderboard-title">🏆 Leaderboard</div>
                        <div class="difficulty">Top 10 Players</div>
                    </div>
                    <div class="leaderboard-list" id="leaderboardList">
                        <div style="text-align: center; color: #666; padding: 40px;">
                            No scores yet. Be the first!
                        </div>
                    </div>
                    <button class="back-button" onclick="flipToGame()">Back to Game</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Initials Modal -->
    <div class="initials-modal" id="initialsModal">
        <div class="initials-content">
            <div class="initials-title">🎉 Puzzle Solved!</div>
            <div class="initials-score" id="finalScore">0</div>
            <div style="margin-bottom: 15px;">Enter your initials for the leaderboard:</div>
            <input type="text" id="initialsInput" class="initials-input" maxlength="3" placeholder="AAA">
            <br>
            <button class="initials-submit" onclick="submitScore()">Submit Score</button>
        </div>
    </div>

    <script>`
        );
        
        // Add Leaderboard button
        html = html.replace(
            '<button class="btn btn-new" onclick="newGame()">New Game</button>',
            '<button class="btn btn-new" onclick="newGame()">New Game</button>\n            <button class="btn btn-leaderboard" onclick="showLeaderboard()">Leaderboard</button>'
        );
        
        // Add ZAD configuration for leaderboard
        const zadConfig = `
        // ZAD configuration for leaderboard
        window.APP_ID = 'sudoku-leaderboard';
        
        // ZAD helper functions
        async function saveScore(scoreData) {
            try {
                const response = await fetch('/api/zad/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: window.APP_ID,
                        data_type: 'leaderboard_score',
                        content_data: scoreData,
                        participant_id: scoreData.initials,
                        action_type: 'leaderboard_score'
                    })
                });
                return response.ok;
            } catch (error) {
                console.error('Failed to save score:', error);
                return false;
            }
        }
        
        async function loadScores() {
            try {
                const response = await fetch(\`/api/zad/load?app_id=\${window.APP_ID}&action_type=leaderboard_score\`);
                if (response.ok) {
                    const data = await response.json();
                    return data.map(item => item.content_data).filter(score => score);
                }
            } catch (error) {
                console.error('Failed to load scores:', error);
            }
            return [];
        }`;
        
        // Add leaderboard functions
        const leaderboardFunctions = `
        let errorsCount = 0;
        let currentScore = 0;
        
        function calculateScore() {
            // Base score starts at 1000
            let score = 1000;
            
            // Time penalty: -1 point per 5 seconds
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            score -= Math.floor(elapsed / 5);
            
            // Hints penalty: -50 points per hint
            score -= hintsUsed * 50;
            
            // Errors penalty: -25 points per error
            score -= errorsCount * 25;
            
            // Minimum score is 100
            return Math.max(100, score);
        }
        
        function showLeaderboard() {
            document.getElementById('flipCard').classList.add('flipped');
            loadAndDisplayLeaderboard();
        }
        
        function flipToGame() {
            document.getElementById('flipCard').classList.remove('flipped');
        }
        
        async function loadAndDisplayLeaderboard() {
            const scores = await loadScores();
            
            // Sort by score descending
            scores.sort((a, b) => b.score - a.score);
            
            // Take top 10
            const topScores = scores.slice(0, 10);
            
            const listEl = document.getElementById('leaderboardList');
            
            if (topScores.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No scores yet. Be the first!</div>';
                return;
            }
            
            listEl.innerHTML = topScores.map((score, index) => {
                const rank = index + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'gold';
                else if (rank === 2) rankClass = 'silver';
                else if (rank === 3) rankClass = 'bronze';
                
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
                
                return \`
                    <div class="leaderboard-entry \${rankClass}">
                        <div class="leaderboard-rank">\${medal}</div>
                        <div class="leaderboard-name">\${score.initials}</div>
                        <div class="leaderboard-score">\${score.score}</div>
                    </div>
                    <div class="leaderboard-details">
                        Time: \${score.time} | Hints: \${score.hints} | Errors: \${score.errors}
                    </div>
                \`;
            }).join('');
        }
        
        function showInitialsModal(score) {
            currentScore = score;
            document.getElementById('finalScore').textContent = \`Score: \${score}\`;
            document.getElementById('initialsModal').style.display = 'block';
            document.getElementById('initialsInput').value = '';
            document.getElementById('initialsInput').focus();
        }
        
        async function submitScore() {
            const initials = document.getElementById('initialsInput').value.toUpperCase();
            
            if (initials.length < 2) {
                alert('Please enter at least 2 characters');
                return;
            }
            
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeStr = \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
            
            const scoreData = {
                initials: initials,
                score: currentScore,
                time: timeStr,
                hints: hintsUsed,
                errors: errorsCount,
                timestamp: new Date().toISOString()
            };
            
            const saved = await saveScore(scoreData);
            
            if (saved) {
                document.getElementById('initialsModal').style.display = 'none';
                showMessage('🏆 Score saved to leaderboard!', 'success');
                setTimeout(() => showLeaderboard(), 1000);
            } else {
                alert('Failed to save score. Please try again.');
            }
        }`;
        
        // Insert the ZAD config and functions
        html = html.replace(
            '// Very easy Sudoku puzzle',
            zadConfig + '\n        \n        ' + leaderboardFunctions + '\n        \n        // Very easy Sudoku puzzle'
        );
        
        // Update checkSolution to track errors and handle completion
        html = html.replace(
            'function checkSolution() {',
            `function checkSolution() {
            let hasErrors = false;
            let errorCount = 0;`
        );
        
        html = html.replace(
            'hasErrors = true;',
            'hasErrors = true;\n                        errorCount++;'
        );
        
        html = html.replace(
            "showMessage('🎉 Congratulations! You solved it!', 'success');",
            `showMessage('🎉 Congratulations! You solved it!', 'success');
                const finalScore = calculateScore();
                setTimeout(() => showInitialsModal(finalScore), 500);`
        );
        
        html = html.replace(
            "showMessage('Some numbers are incorrect', 'error');",
            `errorsCount += errorCount;
                showMessage(\`Some numbers are incorrect (\${errorCount} errors)\`, 'error');`
        );
        
        // Reset errors on new game
        html = html.replace(
            'hintsUsed = 0;',
            'hintsUsed = 0;\n            errorsCount = 0;'
        );
        
        // Update the Sudoku game
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing');
        
        if (error) throw error;
        
        console.log('✅ Leaderboard added successfully!');
        console.log('\n🏆 Features:');
        console.log('  • Flip animation to show leaderboard on back');
        console.log('  • Scoring system (1000 base - penalties for time, hints, errors)');
        console.log('  • Enter initials after completion');
        console.log('  • Top 10 scores with medals');
        console.log('  • Persistent scores via ZAD');
        console.log('\n🎮 Reload the game to see the new Leaderboard button!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addLeaderboard();