#!/usr/bin/env node

/**
 * Fix Sudoku layout issues - remove extra space at top and fix illegible text
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

async function fixLayout() {
    try {
        console.log('🎨 Fixing Sudoku layout issues...');
        
        // Fetch current Sudoku
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-lightning-puma-parasailing')
            .single();
        
        let html = data.html_content;
        
        // Backup current state
        const backupPath = path.join(__dirname, '..', 'backups', `sudoku_before_layout_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backed up current state`);
        
        // Fix the body styles to remove extra space
        // The issue is the min-height: 100vh and centering might be causing issues in iframe
        html = html.replace(
            `body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }`,
            `body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 10px;
            height: 100vh;
            overflow: hidden;
        }`
        );
        
        // Fix the flip-container to not add extra height
        html = html.replace(
            `.flip-container {
            perspective: 1000px;
            width: 100%;
            height: 100%;
            position: relative;
            max-width: 600px;
            max-height: 880px;
        }`,
            `.flip-container {
            perspective: 1000px;
            width: 100%;
            height: calc(100vh - 20px);
            margin: 0 auto;
            max-width: 600px;
        }`
        );
        
        // Fix game container height
        html = html.replace(
            `.game-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 20px;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }`,
            `.game-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 15px;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }`
        );
        
        // Make the grid slightly smaller to fit better
        html = html.replace(
            `.sudoku-grid {
            display: grid;
            grid-template-columns: repeat(9, 1fr);
            gap: 1px;
            background: #333;
            border: 2px solid #333;
            margin: 0 auto 15px;
            width: 450px;
            height: 450px;
        }`,
            `.sudoku-grid {
            display: grid;
            grid-template-columns: repeat(9, 1fr);
            gap: 1px;
            background: #333;
            border: 2px solid #333;
            margin: 0 auto 10px;
            width: 420px;
            height: 420px;
        }`
        );
        
        // Reduce header margin
        html = html.replace(
            `.header {
            text-align: center;
            margin-bottom: 15px;
        }`,
            `.header {
            text-align: center;
            margin-bottom: 10px;
        }`
        );
        
        // Fix title size
        html = html.replace(
            `h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 5px;
        }`,
            `h1 {
            color: #333;
            font-size: 24px;
            margin: 0 0 5px 0;
        }`
        );
        
        // Make sure text is legible - fix any color contrast issues
        html = html.replace(
            `.stats {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 10px;
            font-size: 14px;
            color: #666;
        }`,
            `.stats {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 5px;
            font-size: 13px;
            color: #333;
            font-weight: 500;
        }`
        );
        
        // Reduce button sizes slightly
        html = html.replace(
            `.num-btn {
            width: 40px;
            height: 40px;`,
            `.num-btn {
            width: 38px;
            height: 38px;`
        );
        
        // Reduce padding on buttons
        html = html.replace(
            `.btn {
            padding: 8px 16px;`,
            `.btn {
            padding: 7px 14px;`
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
        
        console.log('✅ Layout fixed!');
        console.log('\n🎨 Changes made:');
        console.log('  • Removed extra vertical spacing');
        console.log('  • Fixed container heights for iframe');
        console.log('  • Reduced grid size slightly (420x420)');
        console.log('  • Improved text legibility');
        console.log('  • Tightened spacing throughout');
        console.log('\n🔄 Reload the game to see the improvements!');
        
    } catch (error) {
        console.error('❌ Failed to fix layout:', error);
        process.exit(1);
    }
}

fixLayout();