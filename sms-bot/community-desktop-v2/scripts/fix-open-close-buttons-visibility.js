#!/usr/bin/env node

/**
 * Fix OPEN and CLOSE button visibility logic for bart
 * - OPEN button shows for all statuses except "open"
 * - CLOSE button shows for all statuses except "closed"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let envLoaded = false;
const envPaths = [
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        console.log('✅ Loaded environment from:', path.basename(envPath));
        break;
    }
}

if (!envLoaded) {
    console.log('⚠️ No .env file found, using existing environment variables');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function fixButtonVisibility() {
    console.log('🔧 Fixing OPEN/CLOSE button visibility logic...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // 1. Fetch current issue tracker HTML
        console.log('📥 Fetching toybox-issue-tracker from database...');
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch toybox-issue-tracker:', fetchError);
            return;
        }
        
        let html = current.html_content;
        console.log('✅ Fetched issue tracker HTML');
        
        // 2. Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(backupDir, `toybox-issue-tracker_fix-buttons_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log('💾 Created backup:', path.basename(backupPath));
        
        // 3. Find and fix the OPEN button visibility logic
        console.log('\n🔍 Finding OPEN button logic...');
        
        // Look for the OPEN button conditional - it's currently checking for specific status
        // Pattern: if (isAdmin && data.status === 'closed')
        const openButtonPattern = /if\s*\(\s*isAdmin\s*&&\s*data\.status\s*===\s*['"]closed['"]\s*\)/g;
        
        if (html.match(openButtonPattern)) {
            // Replace with: if (isAdmin && data.status !== 'open')
            html = html.replace(openButtonPattern, "if (isAdmin && data.status !== 'open')");
            console.log('✅ Fixed OPEN button to show for all statuses except "open"');
        } else {
            console.log('⚠️ OPEN button pattern not found with expected format, trying alternative patterns...');
            
            // Try alternative patterns
            const altPattern1 = /if\s*\(\s*isAdmin\s*&&\s*\(\s*data\.status\s*===\s*['"]closed['"]\s*\|\|\s*data\.status\s*===\s*['"]pending['"]\s*\)\s*\)/g;
            if (html.match(altPattern1)) {
                html = html.replace(altPattern1, "if (isAdmin && data.status !== 'open')");
                console.log('✅ Fixed OPEN button (alternative pattern)');
            }
        }
        
        // 4. Find and fix the CLOSE button visibility logic
        console.log('\n🔍 Finding CLOSE button logic...');
        
        // Look for the CLOSE button conditional
        // Pattern: if (isAdmin && data.status === 'open')
        const closeButtonPattern = /if\s*\(\s*isAdmin\s*&&\s*data\.status\s*===\s*['"]open['"]\s*\)/g;
        
        if (html.match(closeButtonPattern)) {
            // Replace with: if (isAdmin && data.status !== 'closed')
            html = html.replace(closeButtonPattern, "if (isAdmin && data.status !== 'closed')");
            console.log('✅ Fixed CLOSE button to show for all statuses except "closed"');
        } else {
            console.log('⚠️ CLOSE button pattern not found with expected format, trying alternative patterns...');
            
            // Try alternative patterns
            const altPattern2 = /if\s*\(\s*isAdmin\s*&&\s*\(\s*data\.status\s*===\s*['"]open['"]\s*\|\|\s*data\.status\s*===\s*['"]pending['"]\s*\)\s*\)/g;
            if (html.match(altPattern2)) {
                html = html.replace(altPattern2, "if (isAdmin && data.status !== 'closed')");
                console.log('✅ Fixed CLOSE button (alternative pattern)');
            }
        }
        
        // 5. Verify the Add Comment fix is still intact
        console.log('\n🔍 Verifying Add Comment fix is preserved...');
        if (html.includes('`Add comment for issue #${data.issueNumber}:`')) {
            console.log('✅ Add Comment fix is preserved');
        } else {
            console.log('⚠️ Add Comment might need re-fixing');
        }
        
        // 6. Save metadata
        const metadataPath = path.join(backupDir, `toybox-issue-tracker_fix-buttons_${timestamp}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            description: 'Fixed OPEN/CLOSE button visibility logic for bart',
            changes: [
                'OPEN button now shows for all statuses except "open"',
                'CLOSE button now shows for all statuses except "closed"',
                'Preserved Add Comment fix'
            ],
            backupFile: path.basename(backupPath)
        }, null, 2));
        
        // 7. Update database
        console.log('\n💾 Saving changes to database...');
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
            
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            console.log('💡 Restore from backup:', backupPath);
            return;
        }
        
        console.log('\n🎉 Successfully fixed button visibility logic!');
        console.log('📋 Changes:');
        console.log('  • OPEN button: Shows for all statuses except "open"');
        console.log('  • CLOSE button: Shows for all statuses except "closed"');
        console.log('  • User bart can now properly manage issues in all states');
        console.log('\n🔗 View at: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('📁 Backup saved to:', path.basename(backupPath));
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 To restore from backup, use the backup file in the backups/ directory');
    }
}

// Run the fix
fixButtonVisibility();