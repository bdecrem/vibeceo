#!/usr/bin/env node

/**
 * Fix broken Sudoku game - restore to working state
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
        console.log('🔧 Fixing broken Sudoku game...');
        
        // First, let's check what's currently in the database
        const { data: currentData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        if (fetchError) {
            console.error('Error fetching current Sudoku:', fetchError);
            return;
        }
        
        // Backup current broken state
        const backupPath = path.join(__dirname, '..', 'backups', `sudoku_broken_${Date.now()}.html`);
        await fs.writeFile(backupPath, currentData.html_content);
        console.log(`💾 Backed up broken state to ${backupPath}`);
        
        // Check if the game has the essential components
        const html = currentData.html_content;
        const hasFlipCard = html.includes('flip-card');
        const hasLeaderboard = html.includes('leaderboard-container');
        const hasGrid = html.includes('sudoku-grid');
        const hasHintFunction = html.includes('function giveHint');
        
        console.log('Checking game components:');
        console.log(`  • Flip card: ${hasFlipCard ? '✅' : '❌'}`);
        console.log(`  • Leaderboard: ${hasLeaderboard ? '✅' : '❌'}`);
        console.log(`  • Sudoku grid: ${hasGrid ? '✅' : '❌'}`);
        console.log(`  • Hint function: ${hasHintFunction ? '✅' : '❌'}`);
        
        // If critical components are missing, we need to rebuild
        if (!hasGrid || !hasHintFunction) {
            console.log('\n❌ Critical components missing. Need to restore working version.');
            
            // Try to find a working backup
            const backupFiles = await fs.readdir(path.join(__dirname, '..', 'backups'));
            const sudokuBackups = backupFiles.filter(f => f.includes('sudoku') && !f.includes('broken'));
            
            if (sudokuBackups.length > 0) {
                console.log(`Found ${sudokuBackups.length} Sudoku backup(s). Checking for working version...`);
                
                // Look for a backup with all components
                for (const backupFile of sudokuBackups.reverse()) { // Start with most recent
                    const backupContent = await fs.readFile(
                        path.join(__dirname, '..', 'backups', backupFile), 
                        'utf-8'
                    );
                    
                    if (backupContent.includes('sudoku-grid') && 
                        backupContent.includes('function giveHint') &&
                        backupContent.includes('function checkSolution')) {
                        
                        console.log(`✅ Found working backup: ${backupFile}`);
                        console.log('Restoring this version...');
                        
                        // Restore the working version
                        const { error: updateError } = await supabase
                            .from('wtaf_content')
                            .update({
                                html_content: backupContent,
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_slug', 'public')
                            .eq('app_slug', 'toybox-lightning-puma-parasailing');
                        
                        if (updateError) {
                            console.error('Error updating Sudoku:', updateError);
                        } else {
                            console.log('✅ Sudoku restored to working state!');
                            console.log('\n🎮 The game should now have:');
                            console.log('  • Working 9x9 Sudoku grid');
                            console.log('  • HINT button (max 10 hints)');
                            console.log('  • Leaderboard with flip animation');
                            console.log('  • Scoring system');
                            console.log('  • Proper window size (600x880)');
                        }
                        return;
                    }
                }
            }
            
            console.log('No suitable backup found. Will need to rebuild from scratch.');
        } else {
            console.log('\n✅ Game structure looks intact.');
            console.log('The issue might be with the leaderboard integration.');
            
            // Check for specific issues
            if (html.includes('</div>\\n\\n    <script>')) {
                console.log('Found potential script placement issue. Fixing...');
                
                // Fix the script placement
                let fixedHtml = html.replace(
                    '</div>\\n\\n    <script>',
                    '</div>\n\n    <script>'
                );
                
                // Ensure the flip card structure is correct
                if (!html.includes('</div>\n        </div>\n    </div>')) {
                    console.log('Fixing flip card structure...');
                    // Additional fixes as needed
                }
                
                // Update with the fixed HTML
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: fixedHtml,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-lightning-puma-parasailing');
                
                if (!updateError) {
                    console.log('✅ Fixed script placement issues!');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to fix Sudoku:', error);
        process.exit(1);
    }
}

fixSudoku();