#!/usr/bin/env node

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

async function restoreBackup() {
    try {
        // Use the most recent backup from 9:55
        const backupPath = path.join(__dirname, '..', 'backups', 'toybox-os_before_safari_1755795337378.html');
        
        console.log('📂 Restoring from:', backupPath);
        
        const html = await fs.readFile(backupPath, 'utf-8');
        
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) throw error;
        
        console.log('✅ Restored ToyBox OS from backup (9:55 AM)');
        console.log('🔄 This was right before the Safari fix attempts');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

restoreBackup();