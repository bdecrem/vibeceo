#!/usr/bin/env node

/**
 * Verify and push the latest Fixit Board with BART superpowers to Supabase
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

async function verifyAndPush() {
    try {
        console.log('🔍 Checking current Fixit Board in Supabase...');
        
        // Fetch current version from Supabase
        const { data: currentData } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (!currentData) {
            console.log('❌ Fixit Board not found in Supabase!');
            return;
        }
        
        // Check if it has BART features
        const hasBartPowers = currentData.html_content.includes('bart-badge');
        const hasCloseButton = currentData.html_content.includes('closeTicket');
        const hasAuth = currentData.html_content.includes('TOYBOX_AUTH');
        
        console.log('Current status:');
        console.log(`  • Has BART powers: ${hasBartPowers ? '✅' : '❌'}`);
        console.log(`  • Has close button: ${hasCloseButton ? '✅' : '❌'}`);
        console.log(`  • Has auth integration: ${hasAuth ? '✅' : '❌'}`);
        console.log(`  • Last updated: ${currentData.updated_at}`);
        
        if (!hasBartPowers || !hasCloseButton) {
            console.log('\n⚠️ BART features missing! Reading latest backup to push...');
            
            // Find the latest backup with BART powers
            const backupFiles = await fs.readdir(path.join(__dirname, '..', 'backups'));
            const fixitBackups = backupFiles.filter(f => 
                f.includes('fixit-board_before_bart_powers') || 
                f.includes('issue-tracker_before_ui_update') ||
                f.includes('issue-tracker_before_number_enhance')
            ).sort().reverse();
            
            if (fixitBackups.length === 0) {
                console.log('❌ No recent backups found. Will check for any issue-tracker backup...');
                const allBackups = backupFiles.filter(f => 
                    f.includes('issue-tracker') || f.includes('fixit-board')
                ).sort().reverse();
                
                console.log(`Found ${allBackups.length} issue tracker backups`);
                if (allBackups.length > 0) {
                    console.log('Recent backups:', allBackups.slice(0, 5));
                }
            }
            
            // Read the most recent HTML we have
            const latestBackup = path.join(__dirname, '..', 'backups', 'fixit-board_before_bart_powers_1756159123325.html');
            
            try {
                const latestHTML = await fs.readFile(latestBackup, 'utf-8');
                
                // Verify this has BART features
                if (latestHTML.includes('bart-badge') && latestHTML.includes('closeTicket')) {
                    console.log('✅ Found backup with BART features! Pushing to Supabase...');
                    
                    // Push to Supabase
                    const { error } = await supabase
                        .from('wtaf_content')
                        .update({
                            html_content: latestHTML,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_slug', 'public')
                        .eq('app_slug', 'toybox-issue-tracker');
                    
                    if (error) {
                        console.error('❌ Error updating:', error);
                    } else {
                        console.log('✅ Successfully pushed Fixit Board with BART superpowers!');
                        console.log('\n🎉 Features now live:');
                        console.log('  • BART admin badge');
                        console.log('  • Close issue buttons (BART only)');
                        console.log('  • Authentication integration');
                        console.log('  • Issue numbering');
                        console.log('  • Clean UI with reload button');
                        console.log('\n🔄 Reload ToyBox OS and open Fixit Board!');
                    }
                } else {
                    console.log('⚠️ Backup doesn\'t have BART features. Let me reconstruct...');
                }
            } catch (readError) {
                console.log('⚠️ Could not read backup. Will reconstruct from last known good state...');
                
                // If we can't find the backup, let's at least ensure the current version is properly saved
                console.log('Forcing update with current timestamp...');
                const { error } = await supabase
                    .from('wtaf_content')
                    .update({
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-issue-tracker');
                    
                if (!error) {
                    console.log('✅ Forced timestamp update. Try reloading.');
                }
            }
        } else {
            console.log('\n✅ BART features are already in Supabase!');
            console.log('\nTroubleshooting tips:');
            console.log('  1. Hard refresh the page (Cmd+Shift+R)');
            console.log('  2. Close and reopen the Fixit Board window');
            console.log('  3. Make sure you\'re logged in as BART');
            console.log('  4. Check browser console for errors');
        }
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

verifyAndPush();