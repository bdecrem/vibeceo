#!/usr/bin/env node

/**
 * Fix the PIN regex - it's missing the backslash before d
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

async function fixPinRegex() {
    try {
        console.log('🔧 Fixing PIN regex (missing backslash)...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_pin_fix2_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // The problem: /^d{4}$/ (matches literal 'dddd')
        // Should be: /^\d{4}$/ (matches 4 digits)
        
        // Fix the broken regex
        const brokenPattern = "!/^d{4}$/.test(pin)";
        const correctPattern = "!/^\\d{4}$/.test(pin)";
        
        if (html.includes(brokenPattern)) {
            html = html.replace(brokenPattern, correctPattern);
            console.log('✅ Fixed: /^d{4}$/ → /^\\d{4}$/');
        } else {
            console.log('🔍 Looking for other variations...');
            // Try other possible patterns
            html = html.replace(/\/\^d\{4\}\$\//g, '/^\\d{4}$/');
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
        
        console.log('\n✅ PIN regex fixed!');
        console.log('🔐 The regex now correctly matches 4 digits');
        console.log('📋 Test registration with a 4-digit PIN now');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixPinRegex();