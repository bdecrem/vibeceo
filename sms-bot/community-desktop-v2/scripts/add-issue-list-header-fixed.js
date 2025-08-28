#!/usr/bin/env node

/**
 * Add "ISSUE LIST" header above the filter buttons
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function addIssueListHeader() {
    console.log('🔧 Adding ISSUE LIST header above filter buttons...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Find the filter buttons section
    const filterSectionPattern = `<div style="margin-top: 15px; padding: 10px; background: #e8e8e8; border: 1px solid #999;">`;
    
    // Add ISSUE LIST header before it
    const newSection = `<h3 style="text-align: center; margin-top: 20px; margin-bottom: 10px; font-size: 16px; font-weight: bold;">ISSUE LIST</h3>
                    <div style="margin-top: 15px; padding: 10px; background: #e8e8e8; border: 1px solid #999;">`;
    
    if (!html.includes(filterSectionPattern)) {
        console.error('Could not find filter section');
        process.exit(1);
    }
    
    html = html.replace(filterSectionPattern, newSection);
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Added ISSUE LIST header above filter buttons');
    
    console.log('✅ Added ISSUE LIST header above the filter buttons!');
}

addIssueListHeader().catch(console.error);