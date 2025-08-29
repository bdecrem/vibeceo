#!/usr/bin/env node

/**
 * Restore ToyBox OS from backup
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

async function restoreFromBackup() {
    try {
        console.log('🔄 Restoring ToyBox OS from backup...');
        
        // Read TODAY's backup (the one made before auth changes)
        const backupPath = path.join(__dirname, '..', 'toybox-os-backup.html');
        const htmlContent = await fs.readFile(backupPath, 'utf-8');
        
        console.log('📂 Found backup file, size:', htmlContent.length, 'characters');
        
        // Update ToyBox OS with backup content
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('✅ ToyBox OS successfully restored from backup!');
        console.log('🌐 Available at: https://webtoys.ai/public/toybox-os');
        console.log('📅 Backup was from: Aug 20 at 17:31');
        
    } catch (error) {
        console.error('❌ Failed to restore from backup:', error);
        process.exit(1);
    }
}

// Run
restoreFromBackup();