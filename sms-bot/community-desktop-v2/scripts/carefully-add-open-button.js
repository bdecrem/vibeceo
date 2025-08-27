#!/usr/bin/env node

/**
 * CAREFULLY add Open button next to Close button - same pattern
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

async function carefullyAddOpenButton() {
    try {
        console.log('🔧 Carefully adding Open button next to Close button...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Create backup FIRST
        const timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .replace('T', '_')
            .slice(0, -5);
        
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_${timestamp}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // 1. Add CSS for open button (green) - find where close-button style is
        const closeButtonStylePattern = '.close-button {';
        const openButtonStyle = `.open-button {
            padding: 3px 8px;
            font-size: 10px;
            background: #4CAF50;
            color: white;
            border-color: #45a049;
            margin-right: 5px;
        }
        
        .open-button:active {
            background: #45a049;
        }
        
        .close-button {`;
        
        html = html.replace(closeButtonStylePattern, openButtonStyle);
        console.log('✓ Added open button styles (green)');
        
        // 2. Add openTicket function right after closeTicket function
        const closeTicketEnd = html.indexOf('async function closeTicket(issueNumber)');
        if (closeTicketEnd > -1) {
            // Find the end of closeTicket function
            const functionEnd = html.indexOf('\n        }', closeTicketEnd) + 10;
            
            const openTicketFunction = `
        
        // Open ticket function - changes status from pending to open
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
                    // Just reload - no alert
                    loadRecentIssues();
                }
            }
        }`;
            
            html = html.slice(0, functionEnd) + openTicketFunction + html.slice(functionEnd);
            console.log('✓ Added openTicket function');
        }
        
        // 3. Update the button display in loadRecentIssues - find where close button is shown
        const closeButtonPattern = `\${currentUser && currentUser.handle === 'bart' && data.status !== 'closed' ? 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : 
                                        ''
                                    }`;
        
        const newButtonDisplay = `\${currentUser && currentUser.handle === 'bart' ? 
                                        (data.status === 'pending' ? 
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">Open Issue</button>\` : '') +
                                        (data.status !== 'closed' ? 
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : '')
                                        : ''
                                    }`;
        
        html = html.replace(closeButtonPattern, newButtonDisplay);
        console.log('✓ Updated button display logic');
        
        // Save the updated HTML
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n✅ Successfully added Open button!');
        console.log('\nWhat you should see:');
        console.log('  • PENDING issues: Green "Open Issue" + Red "Close Issue" buttons');
        console.log('  • OPEN issues: Only Red "Close Issue" button');
        console.log('  • CLOSED issues: No buttons');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        console.log('Backup was created - can restore if needed');
        process.exit(1);
    }
}

carefullyAddOpenButton();