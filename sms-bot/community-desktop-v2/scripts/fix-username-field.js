#!/usr/bin/env node

/**
 * Fix the username field reference - use 'handle' instead of 'username'
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

async function fixUsernameField() {
    try {
        console.log('🔧 Fixing username field reference (username → handle)...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_handle_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Count replacements
        let replacements = 0;
        
        // Fix all references to window.toyboxUser?.username
        // Change to window.toyboxUser?.handle
        const patterns = [
            {
                old: /window\.toyboxUser\?\.username \|\| window\.toyboxUser/g,
                new: 'window.toyboxUser?.handle || window.toyboxUser',
                desc: 'Optional chaining with fallback'
            },
            {
                old: /window\.toyboxUser\.username/g,
                new: 'window.toyboxUser.handle',
                desc: 'Direct property access'
            },
            {
                old: /toyboxUser\?\.username/g,
                new: 'toyboxUser?.handle',
                desc: 'Optional chaining only'
            }
        ];
        
        patterns.forEach(pattern => {
            const matches = html.match(pattern.old);
            if (matches) {
                html = html.replace(pattern.old, pattern.new);
                replacements += matches.length;
                console.log(`✅ Fixed ${matches.length} instances of: ${pattern.desc}`);
            }
        });
        
        // Also fix the user info display function to use handle
        const userInfoPattern = /const username = window\.toyboxUser\?\.username \|\| window\.toyboxUser;/g;
        if (userInfoPattern.test(html)) {
            html = html.replace(
                userInfoPattern,
                'const username = window.toyboxUser?.handle || window.toyboxUser;'
            );
            replacements++;
            console.log('✅ Fixed user info display function');
        }
        
        // Fix the display that shows logged in user
        const displayPattern = /\${username}/g;
        const displayMatches = html.match(displayPattern);
        if (displayMatches) {
            console.log(`✅ Found ${displayMatches.length} username display references (keeping as is - variable name is fine)`);
        }
        
        // Update the participant_id setting to use handle
        const participantPattern = /participant_id:\s*window\.toyboxUser\?\.username \|\| window\.toyboxUser \|\| 'anonymous'/g;
        if (participantPattern.test(html)) {
            html = html.replace(
                participantPattern,
                "participant_id: window.toyboxUser?.handle || window.toyboxUser || 'anonymous'"
            );
            replacements++;
            console.log('✅ Fixed participant_id assignment');
        }
        
        // Update submittedBy field to use handle
        const submittedByPattern = /submittedBy:\s*window\.toyboxUser\?\.username \|\| window\.toyboxUser \|\| 'anonymous'/g;
        if (submittedByPattern.test(html)) {
            html = html.replace(
                submittedByPattern,
                "submittedBy: window.toyboxUser?.handle || window.toyboxUser || 'anonymous'"
            );
            replacements++;
            console.log('✅ Fixed submittedBy assignment');
        }
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log(`\n✅ Username field fixed! Made ${replacements} replacements.`);
        console.log('\n🎯 What was fixed:');
        console.log('  • Changed from window.toyboxUser.username to window.toyboxUser.handle');
        console.log('  • ToyBox OS uses "handle" not "username" for the user identifier');
        console.log('  • Issue Tracker now correctly reads the logged-in user');
        console.log('\n🔄 Reload Issue Tracker - your username should now appear!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\nIf you\'re logged in as "bart", issues will now show "bart" instead of "anonymous"');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixUsernameField();