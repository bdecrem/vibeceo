#!/usr/bin/env node

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

console.log('🚨 EMERGENCY RESTORE...');

// Read from temp file
const html = await fs.readFile('/tmp/restore-backup2.html', 'utf-8');

// Restore
const { error } = await supabase
    .from('wtaf_content')
    .update({
        html_content: html,
        updated_at: new Date().toISOString()
    })
    .eq('user_slug', 'public')
    .eq('app_slug', 'toybox-issue-tracker');

if (error) {
    console.error('❌ Failed:', error);
} else {
    console.log('✅ RESTORED FROM BACKUP!');
    console.log('The app is working again.');
    console.log('Refresh: https://webtoys.ai/public/toybox-issue-tracker');
}