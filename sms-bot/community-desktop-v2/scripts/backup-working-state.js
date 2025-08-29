#!/usr/bin/env node

/**
 * Backup the current WORKING state of ToyBox OS, MacWord, and Chat
 * BEFORE fixing the PIN validation issue
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

async function backupEverything() {
    try {
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().split('T')[0];
        
        console.log('💾 Creating WORKING STATE backup...');
        console.log(`📅 Date: ${dateStr}`);
        console.log(`⏰ Timestamp: ${timestamp}`);
        
        // Create a special working directory for this backup
        const workingDir = path.join(__dirname, '..', 'backups', `WORKING_STATE_${dateStr}_${timestamp}`);
        await fs.mkdir(workingDir, { recursive: true });
        
        // 1. Backup ToyBox OS
        console.log('\n📱 Backing up ToyBox OS...');
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        await fs.writeFile(
            path.join(workingDir, 'toybox-os.html'),
            toyboxData.html_content
        );
        console.log('  ✅ ToyBox OS backed up');
        
        // 2. Backup MacWord
        console.log('\n📝 Backing up MacWord...');
        const { data: macwordData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        await fs.writeFile(
            path.join(workingDir, 'macword.html'),
            macwordData.html_content
        );
        console.log('  ✅ MacWord backed up');
        
        // 3. Backup ToyBox Chat
        console.log('\n💬 Backing up ToyBox Chat...');
        const { data: chatData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-chat')
            .single();
        
        await fs.writeFile(
            path.join(workingDir, 'toybox-chat.html'),
            chatData.html_content
        );
        console.log('  ✅ ToyBox Chat backed up');
        
        // 4. Create a README for this backup
        const readme = `# ToyBox OS Working State Backup
        
Date: ${dateStr}
Time: ${new Date().toLocaleTimeString()}
Timestamp: ${timestamp}

## Status at Backup Time
✅ ToyBox OS - Working with auth system
✅ MacWord - Working with shared auth
✅ ToyBox Chat - Working with shared auth

## Known Issues
⚠️ Registration PIN validation - "PIN must be 4 digits" error even with valid PIN

## Files Included
- toybox-os.html - Main desktop with auth system
- macword.html - Text editor with auth integration
- toybox-chat.html - Chat app with auth integration

## To Restore
Use scripts/restore-from-backup.js with this directory:
node scripts/restore-from-backup.js ${workingDir}
`;
        
        await fs.writeFile(
            path.join(workingDir, 'README.md'),
            readme
        );
        
        console.log('\n✅ COMPLETE WORKING STATE BACKED UP!');
        console.log(`📁 Location: ${workingDir}`);
        console.log('\n🎉 What\'s working:');
        console.log('  • ToyBox OS authentication');
        console.log('  • MacWord with shared login');
        console.log('  • ToyBox Chat with shared login');
        console.log('  • All apps loading from proper URLs');
        console.log('\n⚠️ Known issue: PIN validation in registration');
        
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

backupEverything();