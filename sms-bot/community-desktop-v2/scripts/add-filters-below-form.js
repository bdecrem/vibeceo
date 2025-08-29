#!/usr/bin/env node

/**
 * Add filter tabs below the form
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

async function addFiltersBelow() {
    try {
        console.log('🔧 Adding filter tabs below the form...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_add_filters_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Add filter tabs HTML and styles
        // First add the CSS for filter tabs
        const styleEndPattern = '</style>';
        const filterStyles = `
        /* Filter tabs */
        .filter-tabs {
            display: flex;
            gap: 0;
            margin: 15px 0;
            border-bottom: 2px solid #000;
            background: #c0c0c0;
        }
        
        .filter-tab {
            background: #c0c0c0;
            border: 2px solid #000;
            border-bottom: none;
            border-style: outset;
            padding: 5px 15px;
            cursor: pointer;
            font-family: Geneva, sans-serif;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: -2px;
        }
        
        .filter-tab:active,
        .filter-tab.active {
            background: #ffffff;
            border-style: inset;
            z-index: 1;
        }
        
        .filter-tab:not(:first-child) {
            margin-left: -2px;
        }
</style>`;
        
        html = html.replace(styleEndPattern, filterStyles);
        console.log('✓ Added filter tab styles');
        
        // Find the form section closing and add filter tabs after it
        const formClosePattern = '</form>\n            </div>';
        const formWithFilters = `</form>
            </div>
            
            <!-- Filter Tabs -->
            <div class="filter-tabs">
                <div class="filter-tab active" onclick="filterIssues('all')">ALL ISSUES</div>
                <div class="filter-tab" onclick="filterIssues('open')">OPEN</div>
                <div class="filter-tab" onclick="filterIssues('closed')">CLOSED</div>
                <div class="filter-tab" onclick="filterIssues('pending')">PENDING</div>
                <div class="filter-tab" onclick="filterIssues('completed')">COMPLETED</div>
            </div>`;
        
        html = html.replace(formClosePattern, formWithFilters);
        console.log('✓ Added filter tabs HTML below form');
        
        // Add the filter JavaScript function
        const scriptPattern = 'window.APP_ID = \'toybox-issue-tracker\';';
        const scriptWithFilter = `window.APP_ID = 'toybox-issue-tracker';
        
        // Filter state
        let currentFilter = 'all';
        
        // Filter function
        function filterIssues(status) {
            currentFilter = status;
            
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            // Filter the displayed issues
            const issueItems = document.querySelectorAll('.issue-item');
            let visibleCount = 0;
            
            issueItems.forEach(item => {
                // Find the status in the issue
                const statusElement = item.querySelector('.issue-status');
                if (!statusElement) {
                    item.style.display = 'none';
                    return;
                }
                
                // Extract status from text
                const statusText = statusElement.textContent.toLowerCase();
                let issueStatus = 'pending';
                
                if (statusText.includes('closed')) {
                    issueStatus = 'closed';
                } else if (statusText.includes('completed')) {
                    issueStatus = 'completed';
                } else if (statusText.includes('pending')) {
                    issueStatus = 'pending';
                }
                
                // Apply filter
                if (status === 'all') {
                    item.style.display = 'block';
                    visibleCount++;
                } else if (status === 'open') {
                    if (issueStatus !== 'closed' && issueStatus !== 'completed') {
                        item.style.display = 'block';
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                } else if (status === issueStatus) {
                    item.style.display = 'block';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
        }`;
        
        html = html.replace(scriptPattern, scriptWithFilter);
        console.log('✓ Added filter JavaScript function');
        
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
        
        console.log('\n🎉 Filter tabs added successfully!');
        console.log('\n📋 What was added:');
        console.log('  • Filter tabs BELOW the issue creation form');
        console.log('  • Clickable filters: ALL, OPEN, CLOSED, PENDING, COMPLETED');
        console.log('  • Filter functionality to show/hide issues');
        
        console.log('\n🔄 Refresh the page:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addFiltersBelow();