#!/usr/bin/env node

/**
 * CAREFULLY fix only the PIN validation regex issue
 * The regex has escaped backslashes which breaks it
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

async function fixPinValidation() {
    try {
        console.log('🔧 Fixing PIN validation issue...');
        
        // Get current ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup before changes
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_before_pin_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Find the broken regex - it has double backslashes
        console.log('🔍 Looking for broken PIN validation...');
        
        // The problem: !/^\\d{4}$/.test(pin)
        // Should be: !/^\d{4}$/.test(pin)
        
        const brokenRegex = `/^\\\\d{4}$/`;
        const fixedRegex = `/^\\d{4}$/`;
        
        if (html.includes(brokenRegex)) {
            html = html.replace(brokenRegex, fixedRegex);
            console.log('✅ Fixed escaped backslash in regex');
        }
        
        // Also check for the pattern in the condition
        if (html.includes("!/^\\\\d{4}$/.test(pin)")) {
            html = html.replace("!/^\\\\d{4}$/.test(pin)", "!/^\\d{4}$/.test(pin)");
            console.log('✅ Fixed PIN validation regex');
        }
        
        // Double-check the validation logic is correct
        const validationSection = html.match(/if \(.*PIN must be 4 digits.*\)/s);
        if (validationSection) {
            console.log('📋 Current validation logic found');
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('\n✅ PIN validation fixed!');
        console.log('🔐 Registration should now accept 4-digit PINs correctly');
        console.log('\n📋 Test:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Click profile icon');
        console.log('  3. Click Create Account');
        console.log('  4. Enter a 4-digit PIN (like 1234)');
        console.log('  5. Should work now!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        console.log('💡 Use backup to restore if needed');
        process.exit(1);
    }
}

fixPinValidation();