#!/usr/bin/env node

/**
 * EMERGENCY REVERT - Put back the theme that was working
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: '../../.env' });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function emergencyRevert() {
    console.log('🚨 EMERGENCY REVERTING THEME TO WORKING VERSION');
    console.log('=' + '='.repeat(50));
    
    try {
        // Use the theme from 5:15 PM that was working
        const workingTheme = fs.readFileSync(
            path.join(__dirname, 'system7-theme-with-apps_2025-08-20T23-51-52-108Z.css'),
            'utf8'
        );
        
        console.log('✅ Using theme from 5:15 PM that was WORKING');
        console.log('📏 Theme size: ' + workingTheme.length + ' characters');
        
        // Apply to database
        console.log('\n🚀 REVERTING to working theme...');
        
        const { error } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: workingTheme,
                updated_at: new Date()
            })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf');
            
        if (error) throw error;
        
        console.log('\n✅ REVERTED TO WORKING THEME!');
        console.log('This is the theme from 5:15 PM before all the mess');
        
    } catch (error) {
        console.error('\n❌ REVERT FAILED:', error.message);
        process.exit(1);
    }
}

// Run immediately
emergencyRevert();