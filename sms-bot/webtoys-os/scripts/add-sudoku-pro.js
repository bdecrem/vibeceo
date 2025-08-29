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

async function addFeatureRichSudoku() {
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
    
    // Remove the basic sudoku if it exists
    const basicSudokuIndex = config.app_registry.findIndex(app => app.id === 'sudoku');
    if (basicSudokuIndex !== -1) {
        config.app_registry.splice(basicSudokuIndex, 1);
        console.log('🗑️  Removed basic Sudoku app');
    }
    
    // Check if feature-rich sudoku already exists
    if (config.app_registry.some(app => app.id === 'sudoku-pro' || app.url === '/public/toybox-lightning-puma-parasailing')) {
        console.log('✅ Feature-rich Sudoku already on desktop');
        return;
    }
    
    // Add feature-rich sudoku
    config.app_registry.push({
        id: 'sudoku-pro',
        name: 'Sudoku Pro',
        icon: '🧩',
        url: '/public/toybox-lightning-puma-parasailing'
    });
    
    // Position it where the old sudoku was
    config.icon_positions = config.icon_positions || {};
    config.icon_positions['sudoku-pro'] = config.icon_positions['sudoku'] || { x: 20, y: 280 };
    delete config.icon_positions['sudoku'];
    
    // Update database
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: config.app_registry,
            icon_positions: config.icon_positions
        })
        .eq('desktop_version', 'webtoys-os-v3');
    
    if (updateError) {
        console.error('Error updating config:', updateError);
    } else {
        console.log('\n✅ Successfully added feature-rich Sudoku to desktop!');
        console.log('🧩 App: Sudoku Pro');
        console.log('🔗 URL: https://webtoys.ai/public/toybox-lightning-puma-parasailing');
        console.log('🖥️  Desktop: https://webtoys.ai/public/toybox-os-v3-test');
        console.log('\n📝 The basic Sudoku has been replaced with your feature-rich version!');
    }
}

addFeatureRichSudoku().catch(console.error);