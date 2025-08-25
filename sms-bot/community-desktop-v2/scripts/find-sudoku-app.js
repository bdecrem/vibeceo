#!/usr/bin/env node

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

async function findSudoku() {
    // Search for sudoku apps
    const { data } = await supabase
        .from('wtaf_content')
        .select('app_slug, user_slug, created_at, original_prompt')
        .or('app_slug.ilike.%sudoku%,original_prompt.ilike.%sudoku%')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (data && data.length > 0) {
        console.log('🎯 Found Sudoku apps:\n');
        data.forEach(app => {
            const url = `https://webtoys.ai/${app.user_slug}/${app.app_slug}`;
            console.log(`📱 ${app.app_slug}`);
            console.log(`   URL: ${url}`);
            console.log(`   Created: ${new Date(app.created_at).toLocaleString()}`);
            if (app.original_prompt) {
                console.log(`   Prompt: ${app.original_prompt.substring(0, 50)}...`);
            }
            console.log('');
        });
        
        // Check if any are ToyBox versions
        const toyboxSudoku = data.find(app => app.app_slug.startsWith('toybox-') && app.app_slug.includes('sudoku'));
        if (toyboxSudoku) {
            console.log('✅ ToyBox Sudoku found!');
            console.log(`🎮 Play directly at: https://webtoys.ai/${toyboxSudoku.user_slug}/${toyboxSudoku.app_slug}`);
        } else {
            // Get the most recent one
            const latest = data[0];
            console.log('🎮 Most recent Sudoku:');
            console.log(`   Play at: https://webtoys.ai/${latest.user_slug}/${latest.app_slug}`);
            
            // Offer to convert it
            console.log('\n📋 To add to ToyBox OS desktop:');
            console.log(`   1. Open App Studio`);
            console.log(`   2. Select "Webtoys (Import Existing App)"`);
            console.log(`   3. Enter: ${latest.app_slug}`);
        }
    } else {
        console.log('❌ No Sudoku apps found');
        
        // Check recent submissions
        const { data: submissions } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('content_data, created_at')
            .eq('app_id', 'toybox-windowed-apps')
            .order('created_at', { ascending: false })
            .limit(5);
        
        console.log('\n📋 Recent app submissions:');
        submissions?.forEach(sub => {
            const content = sub.content_data;
            if (content.appName?.toLowerCase().includes('sudoku') || 
                content.appFunction?.toLowerCase().includes('sudoku')) {
                console.log(`  🎯 SUDOKU: ${content.appName}`);
                console.log(`     Description: ${content.appFunction}`);
                console.log(`     Status: ${content.status}`);
            }
        });
    }
}

findSudoku();