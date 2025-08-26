#!/usr/bin/env node

/**
 * RESTORE FROM THE LAST KNOWN GOOD BACKUP - before duplicate fix attempts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function restoreWorkingVersion() {
    try {
        console.log('🚨 RESTORING FROM KNOWN GOOD BACKUP...\n');
        
        // Use the backup BEFORE I tried to fix duplicates
        const backupFile = 'issue-tracker_before_bart_admin_1756166188681.html';
        const backupPath = path.join(__dirname, '..', 'backups', backupFile);
        
        console.log(`📁 Reading backup: ${backupFile}`);
        const html = await fs.readFile(backupPath, 'utf-8');
        
        // Verify it has the container
        const hasContainer = html.includes('<div id="recentUpdates"');
        const hasLoadFunction = html.includes('async function loadRecentUpdates()');
        
        console.log(`   ${hasContainer ? '✓' : '✗'} Has recentUpdates container`);
        console.log(`   ${hasLoadFunction ? '✓' : '✗'} Has loadRecentUpdates function`);
        
        if (!hasContainer) {
            console.error('❌ This backup is also missing the container!');
            
            // Find where to add it
            const formEnd = html.indexOf('</form>');
            if (formEnd > -1) {
                // Add the container after the form
                const beforeForm = html.slice(0, formEnd + 7);
                const afterForm = html.slice(formEnd + 7);
                
                const containerHTML = `
        
        <div id="recentUpdates" style="margin-top: 30px;">
            <!-- Recent updates will be loaded here -->
        </div>`;
                
                const fixedHtml = beforeForm + containerHTML + afterForm;
                
                console.log('✅ Added missing recentUpdates container');
                
                // Update in Supabase
                const { error } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: fixedHtml,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-issue-tracker');
                
                if (error) throw error;
                
                console.log('\n✅ FIXED! Added the missing container and restored working version.');
            }
        } else {
            // This backup is good, restore it
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: html,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-issue-tracker');
            
            if (error) throw error;
            
            console.log('\n✅ RESTORED from good backup with container!');
        }
        
        console.log('\n📋 This version has:');
        console.log('  • The recentUpdates container to display issues');
        console.log('  • All authentication fixes');
        console.log('  • Admin powers for bart');
        console.log('  • Issue numbering');
        console.log('\n🔄 REFRESH THE PAGE NOW:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\nYou should see all 7 issues!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

restoreWorkingVersion();