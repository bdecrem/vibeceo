#!/usr/bin/env node

/**
 * Simplify Issue Tracker UI - remove warning boxes and update title
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

async function simplifyUI() {
    try {
        console.log('🧹 Simplifying Issue Tracker UI...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_simplify_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // 1. Change the title
        html = html.replace(
            '<title>ToyBox OS Direct Updates</title>',
            '<title>ToyBox OS Fixit Board</title>'
        );
        
        html = html.replace(
            '<h1>🚀 ToyBox OS Direct Updates</h1>',
            '<h1>🔧 ToyBox OS Fixit Board</h1>'
        );
        
        // Update subtitle too
        html = html.replace(
            '<div class="subtitle">Submit fixes and updates that are applied immediately with automatic backups</div>',
            '<div class="subtitle">Report bugs and request features for ToyBox OS</div>'
        );
        
        // 2. Remove the Direct Action Mode warning box
        html = html.replace(
            `
        <div class="warning-banner">
            <strong>⚠️ Direct Action Mode:</strong> Changes are applied immediately to ToyBox OS. All changes are backed up and can be rolled back if needed.
        </div>
        `,
            ''
        );
        
        // Also remove the CSS for warning-banner
        html = html.replace(
            `.warning-banner {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px;
            border-radius: 4px;
        }
        
        .warning-banner strong {
            color: #856404;
        }
        
        `,
            ''
        );
        
        // 3. Remove the Safety Guarantee box
        html = html.replace(
            `
                <div class="safety-info">
                    <h3>🛡️ Safety Guarantee</h3>
                    <ul style="margin-left: 20px; margin-top: 8px;">
                        <li>Every change creates a backup using safe-wrapper</li>
                        <li>File changes are committed to git</li>
                        <li>All actions can be rolled back</li>
                        <li>Backup locations are logged for easy recovery</li>
                    </ul>
                </div>
                `,
            ''
        );
        
        // Also remove the CSS for safety-info
        html = html.replace(
            `.safety-info {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .safety-info h3 {
            color: #2e7d32;
            margin-bottom: 8px;
        }
        
        `,
            ''
        );
        
        // Update the submit button text to be simpler
        html = html.replace(
            'Execute Update with Backup',
            'Submit Issue'
        );
        
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
        
        console.log('✅ UI simplified!');
        console.log('\n🧹 Changes made:');
        console.log('  • Title changed to "ToyBox OS Fixit Board"');
        console.log('  • Removed yellow Direct Action Mode warning');
        console.log('  • Removed green Safety Guarantee box');
        console.log('  • Cleaner, less cluttered interface');
        console.log('  • Button now says "Submit Issue"');
        console.log('\n🔄 Reload Issue Tracker to see the cleaner UI!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

simplifyUI();