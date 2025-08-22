#!/usr/bin/env node

/**
 * Fetch ToyBox OS history and restore a working version
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

async function checkVersions() {
    try {
        console.log('📋 Checking ToyBox OS update history...');
        
        // Get recent updates
        const { data: history, error } = await supabase
            .from('wtaf_content')
            .select('updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (error) throw error;
        
        console.log('Last update:', history.updated_at);
        
        // Get current content
        const { data: current, error: currentError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (currentError) throw currentError;
        
        // Check what's in it
        const hasMacWord = current.html_content.includes('macword');
        const hasProfileIcon = current.html_content.includes('profile-icon');
        const hasAuthModal = current.html_content.includes('authModal');
        
        console.log('Current state:');
        console.log('- Has MacWord:', hasMacWord);
        console.log('- Has Profile Icon:', hasProfileIcon);
        console.log('- Has Auth Modal:', hasAuthModal);
        
        if (!hasMacWord) {
            console.log('\n⚠️ MacWord is missing! This appears to be an old backup.');
            console.log('We need to add MacWord back and fix the auth system properly.');
        }
        
        // Save current as emergency backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox-os_emergency_${Date.now()}.html`);
        await fs.writeFile(backupPath, current.html_content);
        console.log(`\n💾 Saved emergency backup to: ${backupPath}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run
checkVersions();