#!/usr/bin/env node

/**
 * Add a working HINT button to the Sudoku game
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

async function addHintButton() {
    try {
        console.log('💡 Adding HINT button to Sudoku...');
        
        // Fetch current Sudoku game
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        let html = data.html_content;
        
        // Add hint button style
        const hintButtonStyle = `
        .btn-hint {
            background: #ffc107;
            color: #333;
        }
        
        .btn-hint:hover {
            background: #ffb300;
        }`;
        
        // Add style before </style>
        html = html.replace('</style>', hintButtonStyle + '\n    </style>');
        
        // Add HINT button in the action buttons section
        html = html.replace(
            '<button class="btn btn-check" onclick="checkSolution()">Check</button>',
            '<button class="btn btn-hint" onclick="giveHint()">Hint</button>\n            <button class="btn btn-check" onclick="checkSolution()">Check</button>'
        );
        
        // Add hint counter variable and function
        const hintFunction = `
        let hintsUsed = 0;
        const MAX_HINTS = 10;
        
        function giveHint() {
            // Check if we've used too many hints
            if (hintsUsed >= MAX_HINTS) {
                showMessage('No more hints available! (Max: 10)', 'error');
                return;
            }
            
            // Find all empty cells
            const emptyCells = [];
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (userGrid[row][col] === 0) {
                        emptyCells.push({ row, col });
                    }
                }
            }
            
            if (emptyCells.length === 0) {
                showMessage('No empty cells to fill!', 'success');
                return;
            }
            
            // Pick a random empty cell
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const { row, col } = randomCell;
            
            // Fill it with the correct answer
            userGrid[row][col] = solution[row][col];
            
            // Update the display
            const cell = document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`);
            cell.textContent = solution[row][col];
            cell.style.color = '#4caf50'; // Green color for hints
            cell.style.fontWeight = '700';
            cell.classList.add('correct');
            
            // Increment hints counter
            hintsUsed++;
            document.getElementById('hintsUsed').textContent = hintsUsed;
            
            // Show message
            showMessage(\`Hint given! Cell filled at row \${row + 1}, column \${col + 1}. Hints used: \${hintsUsed}/\${MAX_HINTS}\`, 'success');
            
            // Check if complete
            if (isComplete()) {
                checkSolution();
            }
            
            updateEmptyCount();
        }`;
        
        // Insert the hint function after the clearCell function
        html = html.replace(
            'function checkSolution() {',
            hintFunction + '\n        \n        function checkSolution() {'
        );
        
        // Update the newGame function to reset hints counter
        html = html.replace(
            "document.getElementById('hintsUsed').textContent = '0';",
            "hintsUsed = 0;\n            document.getElementById('hintsUsed').textContent = '0';"
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
        
        console.log('✅ HINT button added successfully!');
        console.log('\n💡 Features:');
        console.log('  • Click HINT to fill a random empty cell');
        console.log('  • Maximum 10 hints per game');
        console.log('  • Hints shown in green');
        console.log('  • Counter tracks hints used');
        console.log('\n🎮 Reload the game to see the new HINT button!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addHintButton();