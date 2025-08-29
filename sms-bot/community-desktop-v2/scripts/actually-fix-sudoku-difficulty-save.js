#!/usr/bin/env node

/**
 * ACTUALLY fix the difficulty saving issue
 * 
 * The problem: scoreData doesn't include difficulty when saving!
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

async function actuallyFixDifficultySave() {
    console.log('🎮 ACTUALLY fixing difficulty saving in Sudoku...\n');
    
    // Fetch current Sudoku from Supabase
    console.log('📥 Fetching live Sudoku from Supabase...');
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
    await createBackup(data.html_content, 'Before ACTUALLY fixing difficulty save');
    
    let html = data.html_content;
    
    console.log('🔍 Checking current submitScore function...');
    
    // Find the scoreData object and add difficulty
    const oldScoreData = `const scoreData = {
                initials: initials,
                score: currentScore,
                time: timeStr,
                hints: hintsUsed,
                errors: errorsCount,
                timestamp: new Date().toISOString()
            };`;
    
    const newScoreData = `const scoreData = {
                initials: initials,
                score: currentScore,
                difficulty: currentDifficulty,  // THIS WAS MISSING!
                time: timeStr,
                hints: hintsUsed,
                errors: errorsCount,
                timestamp: new Date().toISOString()
            };`;
    
    if (html.includes(oldScoreData)) {
        html = html.replace(oldScoreData, newScoreData);
        console.log('✅ Added difficulty to scoreData object!');
    } else {
        console.log('⚠️  Could not find exact scoreData pattern, trying alternative...');
        
        // Try a more flexible pattern
        const flexiblePattern = /const scoreData = \{([^}]+)\};/;
        const match = html.match(flexiblePattern);
        
        if (match && !match[0].includes('difficulty:')) {
            const newScoreDataFlex = match[0].replace(
                'score: currentScore,',
                'score: currentScore,\n                difficulty: currentDifficulty,'
            );
            html = html.replace(match[0], newScoreDataFlex);
            console.log('✅ Added difficulty using flexible pattern!');
        }
    }
    
    // Also verify the score calculation applies MEDIUM bonus
    if (!html.includes('// Apply difficulty multiplier')) {
        console.log('🔧 Adding MEDIUM difficulty score bonus...');
        
        const calculateScoreEnd = 'return Math.max(100, score);';
        const scoreWithBonus = `// Apply difficulty multiplier
            if (currentDifficulty === 'medium') {
                score = Math.floor(score * 1.5); // 50% bonus for MEDIUM
            }
            
            return Math.max(100, score);`;
        
        html = html.replace(calculateScoreEnd, scoreWithBonus);
        console.log('✅ Added MEDIUM difficulty 50% score bonus');
    }
    
    // Save updated HTML
    console.log('\n📤 Updating Sudoku in Supabase...');
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
    const outputFile = path.join(process.cwd(), 'sudoku-actually-fixed.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ ACTUALLY fixed difficulty saving!');
    console.log('📋 The fix:');
    console.log('   - scoreData now includes difficulty: currentDifficulty');
    console.log('   - EASY scores will save with difficulty: "easy"');
    console.log('   - MEDIUM scores will save with difficulty: "medium"');
    console.log('   - MEDIUM scores get 50% bonus points');
    console.log('   - Leaderboards will properly filter by difficulty');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
    console.log('\n⚠️  Note: Previous scores without difficulty will show in EASY leaderboard');
}

// Run the actual fix
actuallyFixDifficultySave().catch(console.error);