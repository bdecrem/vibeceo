#!/usr/bin/env node

/**
 * Add difficulty selection to Sudoku game
 * 
 * This script adds:
 * 1. Difficulty selection (EASY/MEDIUM) when clicking New Game
 * 2. Separate leaderboards with tabs for EASY and MEDIUM
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

async function createBackup(htmlContent, appSlug, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    const backupFile = path.join(backupDir, `${appSlug}_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    const metadataFile = path.join(backupDir, `${appSlug}_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    console.log(`💾 Backup created: ${backupFile}`);
    return backupFile;
}

async function fetchSudoku() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-lightning-puma-parasailing')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch Sudoku: ${error.message}`);
    }
    
    return data;
}

async function addDifficultyFeatures() {
    console.log('🎮 Adding difficulty features to Sudoku...\n');
    
    // Fetch current Sudoku
    console.log('📥 Fetching current Sudoku game...');
    const current = await fetchSudoku();
    
    // Create backup
    console.log('💾 Creating backup...');
    await createBackup(current.html_content, 'sudoku', 'Before adding difficulty features');
    
    let html = current.html_content;
    
    // First, let's analyze the current structure
    console.log('🔍 Analyzing game structure...');
    
    // Save a local copy for analysis
    const localFile = path.join(process.cwd(), 'current-sudoku.html');
    fs.writeFileSync(localFile, html);
    console.log(`📄 Saved current version to: ${localFile}`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Analyzing game structure to understand how new game is triggered');
    console.log('2. Will add difficulty selection modal');
    console.log('3. Will modify leaderboard to have tabs');
    console.log('\nPlease wait while I analyze the game code...');
    
    // Return the HTML for further processing
    return html;
}

// Run the initial fetch
addDifficultyFeatures()
    .then(html => {
        console.log('\n✅ Successfully fetched Sudoku game!');
        console.log('📊 File size:', html.length, 'bytes');
        console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
    })
    .catch(console.error);