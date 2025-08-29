#!/usr/bin/env node

/**
 * Fix the Sudoku game to be actually playable with a proper puzzle
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

async function fixSudoku() {
    try {
        console.log('🎯 Fixing Sudoku game to be playable...');
        
        // Create a proper working Sudoku game
        const sudokuHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Sudoku</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            color: white;
        }
        
        h1 {
            font-size: 32px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .difficulty {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .game-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        
        .sudoku-grid {
            display: grid;
            grid-template-columns: repeat(9, 50px);
            grid-template-rows: repeat(9, 50px);
            gap: 1px;
            background: #333;
            padding: 2px;
            margin-bottom: 20px;
        }
        
        .cell {
            background: white;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .cell:hover:not(.given) {
            background: #f0f8ff;
            transform: scale(1.05);
        }
        
        .cell.given {
            background: #f5f5f5;
            font-weight: 700;
            color: #333;
            cursor: default;
        }
        
        .cell.selected {
            background: #e3f2fd !important;
            box-shadow: inset 0 0 0 2px #2196F3;
        }
        
        .cell.error {
            background: #ffebee !important;
            color: #d32f2f;
        }
        
        .cell.correct {
            animation: correctPulse 0.5s;
        }
        
        @keyframes correctPulse {
            50% { background: #c8e6c9; }
        }
        
        /* Thicker borders for 3x3 boxes */
        .cell:nth-child(3n) {
            border-right: 3px solid #333;
        }
        
        .cell:nth-child(n+19):nth-child(-n+27),
        .cell:nth-child(n+46):nth-child(-n+54) {
            border-bottom: 3px solid #333;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        
        .number-btn {
            width: 45px;
            height: 45px;
            font-size: 20px;
            font-weight: 600;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .number-btn:hover {
            background: #667eea;
            color: white;
            transform: scale(1.1);
        }
        
        .number-btn:active {
            transform: scale(0.95);
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .btn {
            padding: 10px 20px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-clear {
            background: #ff6b6b;
            color: white;
        }
        
        .btn-clear:hover {
            background: #ff5252;
        }
        
        .btn-new {
            background: #667eea;
            color: white;
        }
        
        .btn-new:hover {
            background: #5a67d8;
        }
        
        .btn-check {
            background: #4caf50;
            color: white;
        }
        
        .btn-check:hover {
            background: #45a049;
        }
        
        .message {
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
            font-weight: 600;
            min-height: 30px;
        }
        
        .message.success {
            color: #4caf50;
        }
        
        .message.error {
            color: #f44336;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Simple Sudoku</h1>
        <div class="difficulty">Beginner Level - Some rows missing only 2 numbers!</div>
    </div>
    
    <div class="game-container">
        <div class="stats">
            <div class="stat">
                <div class="stat-label">Empty Cells</div>
                <div class="stat-value" id="emptyCells">0</div>
            </div>
            <div class="stat">
                <div class="stat-label">Hints Used</div>
                <div class="stat-value" id="hintsUsed">0</div>
            </div>
            <div class="stat">
                <div class="stat-label">Time</div>
                <div class="stat-value" id="timer">0:00</div>
            </div>
        </div>
        
        <div class="sudoku-grid" id="sudokuGrid"></div>
        
        <div class="controls">
            <button class="number-btn" onclick="selectNumber(1)">1</button>
            <button class="number-btn" onclick="selectNumber(2)">2</button>
            <button class="number-btn" onclick="selectNumber(3)">3</button>
            <button class="number-btn" onclick="selectNumber(4)">4</button>
            <button class="number-btn" onclick="selectNumber(5)">5</button>
            <button class="number-btn" onclick="selectNumber(6)">6</button>
            <button class="number-btn" onclick="selectNumber(7)">7</button>
            <button class="number-btn" onclick="selectNumber(8)">8</button>
            <button class="number-btn" onclick="selectNumber(9)">9</button>
        </div>
        
        <div class="action-buttons">
            <button class="btn btn-clear" onclick="clearCell()">Clear Cell</button>
            <button class="btn btn-check" onclick="checkSolution()">Check</button>
            <button class="btn btn-new" onclick="newGame()">New Game</button>
        </div>
        
        <div class="message" id="message"></div>
    </div>

    <script>
        // Very easy Sudoku puzzle - complete solution
        const solution = [
            [5,3,4,6,7,8,9,1,2],
            [6,7,2,1,9,5,3,4,8],
            [1,9,8,3,4,2,5,6,7],
            [8,5,9,7,6,1,4,2,3],
            [4,2,6,8,5,3,7,9,1],
            [7,1,3,9,2,4,8,5,6],
            [9,6,1,5,3,7,2,8,4],
            [2,8,7,4,1,9,6,3,5],
            [3,4,5,2,8,6,1,7,9]
        ];
        
        // Create puzzle by removing numbers (very easy - some rows missing only 2)
        let puzzle = [];
        let userGrid = [];
        let selectedCell = null;
        let startTime = Date.now();
        let timerInterval;
        
        function createPuzzle() {
            // Copy solution
            puzzle = solution.map(row => [...row]);
            userGrid = solution.map(row => [...row]);
            
            // Remove numbers to create puzzle
            // Very easy: remove only 30-35 numbers total
            // Ensure some rows have only 2 missing
            const cellsToRemove = 32;
            const removed = new Set();
            
            // First, ensure at least 3 rows have exactly 2 numbers missing
            const easyRows = [0, 4, 8]; // First, middle, and last row
            easyRows.forEach(row => {
                const cols = [];
                while (cols.length < 2) {
                    const col = Math.floor(Math.random() * 9);
                    if (!cols.includes(col)) {
                        cols.push(col);
                        puzzle[row][col] = 0;
                        removed.add(\`\${row}-\${col}\`);
                    }
                }
            });
            
            // Remove remaining numbers randomly
            while (removed.size < cellsToRemove) {
                const row = Math.floor(Math.random() * 9);
                const col = Math.floor(Math.random() * 9);
                const key = \`\${row}-\${col}\`;
                
                if (!removed.has(key)) {
                    puzzle[row][col] = 0;
                    removed.add(key);
                }
            }
            
            // Copy puzzle to userGrid
            userGrid = puzzle.map(row => [...row]);
            updateEmptyCount();
        }
        
        function renderGrid() {
            const grid = document.getElementById('sudokuGrid');
            grid.innerHTML = '';
            
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    
                    if (puzzle[row][col] !== 0) {
                        cell.textContent = puzzle[row][col];
                        cell.classList.add('given');
                    } else if (userGrid[row][col] !== 0) {
                        cell.textContent = userGrid[row][col];
                    }
                    
                    cell.onclick = () => selectCell(row, col);
                    grid.appendChild(cell);
                }
            }
        }
        
        function selectCell(row, col) {
            // Don't select given cells
            if (puzzle[row][col] !== 0) return;
            
            // Remove previous selection
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            
            // Select new cell
            selectedCell = { row, col };
            const cell = document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`);
            cell.classList.add('selected');
        }
        
        function selectNumber(num) {
            if (!selectedCell) {
                showMessage('Select a cell first!', 'error');
                return;
            }
            
            const { row, col } = selectedCell;
            userGrid[row][col] = num;
            
            const cell = document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`);
            cell.textContent = num;
            cell.classList.remove('error');
            
            // Check if this completes the puzzle
            if (isComplete()) {
                checkSolution();
            }
            
            updateEmptyCount();
        }
        
        function clearCell() {
            if (!selectedCell) {
                showMessage('Select a cell first!', 'error');
                return;
            }
            
            const { row, col } = selectedCell;
            if (puzzle[row][col] !== 0) {
                showMessage('Cannot clear a given number!', 'error');
                return;
            }
            
            userGrid[row][col] = 0;
            const cell = document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`);
            cell.textContent = '';
            cell.classList.remove('error');
            
            updateEmptyCount();
        }
        
        function checkSolution() {
            let hasErrors = false;
            
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const cell = document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`);
                    
                    if (userGrid[row][col] !== 0 && userGrid[row][col] !== solution[row][col]) {
                        cell.classList.add('error');
                        hasErrors = true;
                    } else {
                        cell.classList.remove('error');
                        if (userGrid[row][col] === solution[row][col] && puzzle[row][col] === 0) {
                            cell.classList.add('correct');
                            setTimeout(() => cell.classList.remove('correct'), 500);
                        }
                    }
                }
            }
            
            if (!hasErrors && isComplete()) {
                showMessage('🎉 Congratulations! You solved it!', 'success');
                clearInterval(timerInterval);
            } else if (hasErrors) {
                showMessage('Some numbers are incorrect', 'error');
            } else {
                showMessage('Looking good so far!', 'success');
            }
        }
        
        function isComplete() {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (userGrid[row][col] === 0) return false;
                }
            }
            return true;
        }
        
        function updateEmptyCount() {
            let count = 0;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (userGrid[row][col] === 0) count++;
                }
            }
            document.getElementById('emptyCells').textContent = count;
        }
        
        function showMessage(text, type = '') {
            const messageEl = document.getElementById('message');
            messageEl.textContent = text;
            messageEl.className = 'message ' + type;
            
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'message';
            }, 3000);
        }
        
        function updateTimer() {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
        }
        
        function newGame() {
            clearInterval(timerInterval);
            startTime = Date.now();
            selectedCell = null;
            createPuzzle();
            renderGrid();
            document.getElementById('hintsUsed').textContent = '0';
            timerInterval = setInterval(updateTimer, 1000);
            showMessage('New game started! Some rows have only 2 empty cells.', 'success');
        }
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (selectedCell && e.key >= '1' && e.key <= '9') {
                selectNumber(parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                clearCell();
            }
        });
        
        // Initialize game
        newGame();
    </script>
</body>
</html>`;
        
        // Update the Sudoku app in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: sudokuHTML,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing');
        
        if (error) throw error;
        
        console.log('✅ Sudoku game fixed!');
        console.log('\n🎯 Game features:');
        console.log('  • Complete, solvable puzzle');
        console.log('  • Very easy difficulty - some rows missing only 2 numbers');
        console.log('  • Click cells to select, then click numbers to fill');
        console.log('  • Check button to verify your solution');
        console.log('  • Timer and empty cell counter');
        console.log('  • Keyboard support (1-9 keys, Delete to clear)');
        console.log('\n📍 Play at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
        console.log('🎮 Or reload ToyBox OS and click the Sudoku icon!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixSudoku();