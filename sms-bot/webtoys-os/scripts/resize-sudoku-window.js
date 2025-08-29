#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function resizeSudokuWindow() {
    // Get current desktop config
    const { data: config, error: fetchError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .single();
    
    if (fetchError) {
        console.error('Error fetching config:', fetchError);
        return;
    }
    
    // Find Sudoku Pro in the app registry
    const sudokuIndex = config.app_registry.findIndex(app => app.id === 'sudoku-pro');
    
    if (sudokuIndex === -1) {
        console.error('❌ Sudoku Pro not found in the app registry');
        return;
    }
    
    // Update the window dimensions for Sudoku Pro
    config.app_registry[sudokuIndex].width = 600;
    config.app_registry[sudokuIndex].height = 750;  // Extra height for nice padding below buttons
    
    console.log('📱 Found Sudoku Pro:', config.app_registry[sudokuIndex]);
    
    // Update database
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: config.app_registry
        })
        .eq('desktop_version', 'webtoys-os-v3');
    
    if (updateError) {
        console.error('Error updating config:', updateError);
    } else {
        console.log('✅ Sudoku Pro window resized successfully!');
        console.log('📐 New dimensions: 600px wide × 750px tall');
        console.log('🎮 The buttons below the game board now have nice padding');
        console.log('\n🔄 Refresh the desktop to see the changes:');
        console.log('   https://webtoys.ai/public/toybox-os-v3-test');
    }
}

resizeSudokuWindow().catch(console.error);