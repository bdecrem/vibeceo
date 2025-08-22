#!/usr/bin/env node

/**
 * Apply the BEAUTIFUL System 7 theme to database
 * This replaces the ugly striped windows with clean, professional ones
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

async function applyBeautifulTheme() {
    console.log('🎨 APPLYING BEAUTIFUL SYSTEM 7 THEME');
    console.log('=' + '='.repeat(50));
    
    try {
        // Read the beautiful theme (not the ugly striped one)
        const beautifulTheme = fs.readFileSync(
            path.join(__dirname, '../themes/system7/system7.css'),
            'utf8'
        );
        
        console.log('📏 Theme size: ' + beautifulTheme.length + ' characters');
        
        // Key improvements in this theme:
        console.log('\n✨ What this fixes:');
        console.log('  ✅ Clean solid gray title bars (no ugly stripes)');
        console.log('  ✅ Simple close box (no "B: V2" text)');
        console.log('  ✅ Professional 3D beveled borders');
        console.log('  ✅ Authentic System 7 appearance');
        console.log('  ✅ No duplicate Apple icons');
        
        // Apply to database
        console.log('\n🚀 Updating System 7 theme in database...');
        
        const { error } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: beautifulTheme,
                updated_at: new Date()
            })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf');
            
        if (error) throw error;
        
        console.log('\n✅ BEAUTIFUL THEME APPLIED!');
        console.log('\n🎉 Your windows will now:');
        console.log('  • Look like real System 7 (not MS Paint)');
        console.log('  • Have clean, professional appearance');
        console.log('  • No more ugly striped title bars');
        console.log('  • No more "B: V2" in close boxes');
        
        console.log('\n🔗 See the results:');
        console.log('  • ToyBox OS: https://webtoys.ai/public/toybox-os');
        console.log('  • Any windowed app (like Notepad)');
        
    } catch (error) {
        console.error('\n❌ Failed to apply theme:', error.message);
        process.exit(1);
    }
}

// Run immediately
applyBeautifulTheme();