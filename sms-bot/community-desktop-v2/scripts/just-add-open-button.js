#!/usr/bin/env node

/**
 * JUST ADD THE OPEN BUTTON - SIMPLE!
 */

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

async function justAddOpenButton() {
    try {
        console.log('Adding Open button - SIMPLE!\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup
        const timestamp = Date.now();
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_${timestamp}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup: ${path.basename(backupPath)}`);
        
        // 1. Find where the Close button is displayed in loadRecentUpdates
        const oldButtonCode = `\${currentUser && currentUser.handle === 'bart' && data.status !== 'closed' ? 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : 
                                        ''
                                    }`;
        
        // Replace with BOTH buttons
        const newButtonCode = `\${currentUser && currentUser.handle === 'bart' ? 
                                        (data.status === 'pending' ? 
                                            \`<button style="padding: 3px 8px; font-size: 10px; background: #4CAF50; color: white; border: 2px solid #45a049; margin-right: 5px;" onclick="openTicket(\${data.issueNumber})">Open Issue</button>\` : '') +
                                        (data.status !== 'closed' ? 
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : '')
                                        : ''
                                    }`;
        
        html = html.replace(oldButtonCode, newButtonCode);
        console.log('✓ Added Open button display');
        
        // 2. Add openTicket function if it doesn't exist
        if (!html.includes('function openTicket')) {
            const openFunction = `
        
        // Open ticket - just like close but sets status to open
        async function openTicket(issueNumber) {
            if (!currentUser || currentUser.handle !== 'bart') {
                alert('Only bart (admin) can open tickets!');
                return;
            }
            
            const updates = await load('update_request');
            const targetIssue = updates.find(u => 
                u.content_data && u.content_data.issueNumber === issueNumber
            );
            
            if (targetIssue) {
                targetIssue.content_data.status = 'open';
                targetIssue.content_data.openedBy = currentUser.handle;
                targetIssue.content_data.openedAt = new Date().toISOString();
                
                const saved = await save('update_request', targetIssue.content_data);
                if (saved) {
                    loadRecentUpdates();
                }
            }
        }`;
            
            // Add it after closeTicket
            const closeEnd = html.indexOf('async function closeTicket');
            if (closeEnd > -1) {
                const insertPoint = html.indexOf('\n        }', closeEnd) + 10;
                html = html.slice(0, insertPoint) + openFunction + html.slice(insertPoint);
                console.log('✓ Added openTicket function');
            }
        }
        
        // Save to Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n✅ DONE! Open button added!');
        console.log('Green button on PENDING issues, changes status to OPEN.');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

justAddOpenButton();