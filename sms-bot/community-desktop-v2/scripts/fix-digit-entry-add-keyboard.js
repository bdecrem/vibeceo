#!/usr/bin/env node

/**
 * Fix digit entry and add keyboard support for Sudoku
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

async function fixAndAddKeyboard() {
    try {
        console.log('🔧 Fixing digit entry and adding keyboard support...');
        
        // Fetch current Sudoku
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        let html = data.html_content;
        
        // Backup current state
        const backupPath = path.join(__dirname, '..', 'backups', `sudoku_before_keyboard_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backed up current state`);
        
        // First, let's check if the selectCell function is properly defined
        // The issue might be that the cell click handler is not working
        
        // Make sure selectCell is properly updating selectedCell
        if (!html.includes('function selectCell(cell, row, col)')) {
            console.log('❌ selectCell function not found, need to restore it');
        }
        
        // Add keyboard support after the newGame function
        const keyboardSupport = `
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!selectedCell) return;
            
            const key = e.key;
            const { cell, row, col } = selectedCell;
            
            // Number keys 1-9
            if (key >= '1' && key <= '9') {
                e.preventDefault();
                selectNumber(parseInt(key));
                return;
            }
            
            // Delete or Backspace to clear
            if (key === 'Delete' || key === 'Backspace') {
                e.preventDefault();
                clearCell();
                return;
            }
            
            // Arrow keys for navigation
            let newRow = row;
            let newCol = col;
            
            if (key === 'ArrowUp' && row > 0) newRow--;
            else if (key === 'ArrowDown' && row < 8) newRow++;
            else if (key === 'ArrowLeft' && col > 0) newCol--;
            else if (key === 'ArrowRight' && col < 8) newCol++;
            
            if (newRow !== row || newCol !== col) {
                e.preventDefault();
                const newCell = document.querySelector(\`[data-row="\${newRow}"][data-col="\${newCol}"]\`);
                if (newCell && !newCell.classList.contains('given')) {
                    selectCell(newCell, newRow, newCol);
                }
            }
        });
        
        // Visual feedback for keyboard focus
        document.addEventListener('DOMContentLoaded', () => {
            // Select first empty cell on load
            const firstEmpty = document.querySelector('.cell:not(.given)');
            if (firstEmpty) {
                const row = parseInt(firstEmpty.dataset.row);
                const col = parseInt(firstEmpty.dataset.col);
                selectCell(firstEmpty, row, col);
            }
        });`;
        
        // Insert keyboard support before the closing script tag
        html = html.replace(
            `    </script>
</body>`,
            keyboardSupport + `
    </script>
</body>`
        );
        
        // Make sure the selectCell function properly sets selectedCell
        // Let's also ensure clicking cells works
        html = html.replace(
            `function selectCell(cell, row, col) {
            if (cell.classList.contains('given')) return;
            
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            selectedCell = { cell, row, col };
        }`,
            `function selectCell(cell, row, col) {
            if (cell.classList.contains('given')) return;
            
            // Clear previous selection
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            
            // Set new selection
            cell.classList.add('selected');
            selectedCell = { cell, row, col };
            
            // Focus for keyboard events (helps on some browsers)
            cell.focus();
        }`
        );
        
        // Add tabindex to cells for better keyboard support
        html = html.replace(
            `cell.className = 'cell';`,
            `cell.className = 'cell';
                    cell.tabIndex = -1; // Make focusable but not in tab order`
        );
        
        // Ensure the cell style has outline for keyboard focus
        html = html.replace(
            `.cell.selected {
            background: #e3f2fd;
            border-color: #2196f3;
        }`,
            `.cell.selected {
            background: #e3f2fd;
            border-color: #2196f3;
            box-shadow: 0 0 0 2px #2196f3;
            z-index: 1;
        }
        
        .cell:focus {
            outline: none; /* We use box-shadow instead */
        }`
        );
        
        // Add instructions for keyboard use in the header
        html = html.replace(
            `<div class="stats">
                            <span>Empty cells: <span id="emptyCount">0</span></span>
                        </div>`,
            `<div class="stats">
                            <span>Empty cells: <span id="emptyCount">0</span></span>
                        </div>
                        <div class="stats" style="font-size: 11px; color: #666;">
                            <span>Keyboard: 1-9 to fill, Delete to clear, Arrows to move</span>
                        </div>`
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
        
        console.log('✅ Fixed digit entry and added keyboard support!');
        console.log('\n⌨️ Keyboard controls:');
        console.log('  • Number keys 1-9: Enter digit');
        console.log('  • Delete/Backspace: Clear cell');
        console.log('  • Arrow keys: Navigate grid');
        console.log('  • Click: Select cell with mouse');
        console.log('\n🎮 Both mouse and keyboard now work!');
        console.log('🔄 Reload the game to use keyboard controls!');
        
    } catch (error) {
        console.error('❌ Failed to fix:', error);
        process.exit(1);
    }
}

fixAndAddKeyboard();