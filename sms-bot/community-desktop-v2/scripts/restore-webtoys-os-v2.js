#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment through safe wrapper
import('./safe-update-wrapper.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function restoreWebtoysOSV2(backupFile) {
        console.log('🔄 Restoring webtoys-os-v2 from backup...');
        console.log('📁 Backup file:', backupFile);

        try {
            // Check if backup file exists
            const backupPath = path.join(__dirname, '../backups', backupFile);
            if (!fs.existsSync(backupPath)) {
                console.error('❌ Backup file not found:', backupPath);
                return;
            }

            // Read backup content
            const htmlContent = fs.readFileSync(backupPath, 'utf8');
            console.log('📏 Backup content size:', htmlContent.length, 'bytes');

            // Create a backup of current state first
            const { data: current } = await supabase
                .from('wtaf_content')
                .select('html_content')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (current) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const currentBackupPath = path.join(__dirname, '../backups', `webtoys-os-v2_before-restore_${timestamp}.html`);
                fs.writeFileSync(currentBackupPath, current.html_content);
                console.log('💾 Created backup of current state:', path.basename(currentBackupPath));
            }

            // Restore from backup
            const { error } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: htmlContent,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (error) {
                console.error('❌ Restore failed:', error);
                return;
            }

            console.log('✅ Successfully restored webtoys-os-v2!');
            console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');

            // Save restored version locally for inspection
            const restoredPath = path.join(__dirname, '../current-webtoys-os-v2-restored.html');
            fs.writeFileSync(restoredPath, htmlContent);
            console.log('💾 Saved restored version to:', path.basename(restoredPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Get backup file from command line argument
    const backupFile = process.argv[2];
    if (!backupFile) {
        console.error('❌ Usage: node restore-webtoys-os-v2.js <backup-file>');
        console.log('Available backups:');
        const backupDir = path.join(__dirname, '../backups');
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('webtoys-os-v2_') && f.endsWith('.html'))
            .sort()
            .reverse()
            .slice(0, 10);
        files.forEach(f => console.log('  ', f));
        process.exit(1);
    }

    // Run the restore
    await restoreWebtoysOSV2(backupFile);
}, 100);