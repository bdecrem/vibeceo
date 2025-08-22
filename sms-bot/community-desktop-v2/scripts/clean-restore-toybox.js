#!/usr/bin/env node

/**
 * Clean restore of ToyBox OS HTML from backup
 * Using the 6:11 PM version which was before all the theme changes
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

async function cleanRestoreToyBox() {
    console.log('🔄 CLEAN RESTORE OF TOYBOX OS HTML');
    console.log('=' + '='.repeat(50));
    
    try {
        // Use the 6:11 PM backup - this was working well
        const backupFile = path.join(__dirname, '../backups/toybox-os_2025-08-20_18-11-14.html');
        
        console.log('📂 Using backup from: 6:11 PM (Aug 20)');
        console.log('📄 File: toybox-os_2025-08-20_18-11-14.html');
        
        // Read the backup
        const backupHtml = fs.readFileSync(backupFile, 'utf8');
        
        console.log(`📏 Backup size: ${backupHtml.length} characters`);
        
        // Apply to Supabase
        console.log('\n🚀 Applying clean backup to Supabase...');
        
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: backupHtml,
                updated_at: new Date()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
            
        if (error) throw error;
        
        console.log('✅ ToyBox OS HTML cleanly restored!');
        console.log('\n📋 What was restored:');
        console.log('  • Menu bar with horizontal layout');
        console.log('  • All desktop icons in their positions');
        console.log('  • Window manager code');
        console.log('  • Original fonts and sizing');
        
        console.log('\n⚠️  Note: You mentioned you will restore the System 7 theme separately');
        
        console.log('\n🔗 Check result at: https://webtoys.ai/public/toybox-os');
        
        // Also save locally for reference
        fs.writeFileSync(
            path.join(__dirname, '../current-toybox-os.html'),
            backupHtml
        );
        console.log('💾 Also saved locally as current-toybox-os.html');
        
    } catch (error) {
        console.error('\n❌ RESTORE FAILED:', error.message);
        process.exit(1);
    }
}

// Run immediately
cleanRestoreToyBox();