#!/usr/bin/env node

/**
 * Make filter toggles functional - filter by status field
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

async function makeFiltersWork() {
    try {
        console.log('🔧 Making filter toggles functional...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_filter_logic_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Add onclick handlers to filter tabs
        html = html.replace('data-filter="all">All Issues</div>', 'data-filter="all" onclick="filterByStatus(\'all\')">All Issues</div>');
        html = html.replace('data-filter="open">Open</div>', 'data-filter="open" onclick="filterByStatus(\'open\')">Open</div>');
        html = html.replace('data-filter="closed">Closed</div>', 'data-filter="closed" onclick="filterByStatus(\'closed\')">Closed</div>');
        html = html.replace('data-filter="pending">Pending</div>', 'data-filter="pending" onclick="filterByStatus(\'pending\')">Pending</div>');
        html = html.replace('data-filter="completed">Completed</div>', 'data-filter="completed" onclick="filterByStatus(\'completed\')">Completed</div>');
        
        console.log('✓ Added onclick handlers to filter tabs');
        
        // Add the filter function in the script section
        const scriptMarker = '// Configuration\n        window.APP_ID = \'toybox-issue-tracker\';';
        const filterScript = `// Configuration
        window.APP_ID = 'toybox-issue-tracker';
        
        // Filter function
        function filterByStatus(status) {
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-filter') === status) {
                    tab.classList.add('active');
                }
            });
            
            // Filter the issues
            const issueItems = document.querySelectorAll('.issue-item');
            issueItems.forEach(item => {
                // Get the status from the issue
                const statusElement = item.querySelector('.issue-status');
                if (!statusElement) return;
                
                // Extract status text (e.g., "Status: pending")
                const statusText = statusElement.textContent.toLowerCase();
                let issueStatus = 'pending'; // default
                
                if (statusText.includes('closed')) {
                    issueStatus = 'closed';
                } else if (statusText.includes('completed')) {
                    issueStatus = 'completed';
                } else if (statusText.includes('pending')) {
                    issueStatus = 'pending';
                }
                
                // Show/hide based on filter
                if (status === 'all') {
                    item.style.display = 'block';
                } else if (status === 'open') {
                    // Open = anything NOT closed or completed
                    item.style.display = (issueStatus !== 'closed' && issueStatus !== 'completed') ? 'block' : 'none';
                } else {
                    // Match specific status
                    item.style.display = (issueStatus === status) ? 'block' : 'none';
                }
            });
        }`;
        
        html = html.replace(scriptMarker, filterScript);
        console.log('✓ Added filter function to script');
        
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
        
        console.log('\n✅ Filter toggles are now functional!');
        console.log('\n📋 How it works:');
        console.log('  • ALL - Shows all issues');
        console.log('  • OPEN - Shows issues NOT closed or completed');
        console.log('  • CLOSED - Shows only closed issues');
        console.log('  • PENDING - Shows only pending issues');
        console.log('  • COMPLETED - Shows only completed issues');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

makeFiltersWork();