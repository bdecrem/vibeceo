#!/usr/bin/env node

/**
 * RESTORE THE CORRECT BACKUP WITH CLEAN UP DESKTOP
 * Using 12:31 AM version which HAS Clean Up Desktop working
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

async function restoreWithCleanUp() {
    console.log('🔄 RESTORING CORRECT BACKUP WITH CLEAN UP DESKTOP');
    console.log('=' + '='.repeat(50));
    
    try {
        // Use the 12:31 AM backup which HAS Clean Up Desktop
        const backupFile = path.join(__dirname, '../backups/toybox-os_2025-08-21_00-31-15.html');
        
        console.log('✅ Using backup from: 12:31 AM (Aug 21)');
        console.log('✅ This version HAS Clean Up Desktop working!');
        console.log('📄 File: toybox-os_2025-08-21_00-31-15.html');
        
        // Read the backup
        const backupHtml = fs.readFileSync(backupFile, 'utf8');
        
        // Verify it has Clean Up
        if (backupHtml.includes('cleanUpDesktop')) {
            console.log('✅ VERIFIED: Clean Up Desktop function exists');
        }
        if (backupHtml.includes('Clean Up Desktop')) {
            console.log('✅ VERIFIED: Clean Up Desktop menu item exists');
        }
        
        console.log(`📏 Backup size: ${backupHtml.length} characters`);
        
        // Apply to Supabase
        console.log('\n🚀 Restoring to Supabase...');
        
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: backupHtml,
                updated_at: new Date()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
            
        if (error) throw error;
        
        console.log('\n✅ SUCCESS! ToyBox OS restored with:');
        console.log('  ✅ Clean Up Desktop function');
        console.log('  ✅ Special menu with Clean Up option');
        console.log('  ✅ Horizontal menu bar');
        console.log('  ✅ All features that were working at 12:31 AM');
        
        console.log('\n⚠️  Note about the duplicate Apple icon:');
        console.log('  The System 7 theme CSS adds a second Apple via ::before');
        console.log('  When you restore the theme, remove that ::before rule');
        
        console.log('\n🔗 Check result at: https://webtoys.ai/public/toybox-os');
        
        // Save locally too
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
restoreWithCleanUp();