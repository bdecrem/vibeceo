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
    
    // Find the filter buttons section and add ISSUE LIST header above it
    const filterButtonsPattern = `<div style="margin: 10px 0; text-align: center;">
                    <button onclick="filterByStatus('all')" style="margin: 0 5px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">All Issues</button>`;
    
    const newSection = `<h3 style="text-align: center; margin-top: 20px; margin-bottom: 10px;">ISSUE LIST</h3>
                <div style="margin: 10px 0; text-align: center;">
                    <button onclick="filterByStatus('all')" style="margin: 0 5px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">All Issues</button>`;
    
    if (!html.includes(filterButtonsPattern)) {
        console.error('Could not find filter buttons section');
        process.exit(1);
    }
    
    html = html.replace(filterButtonsPattern, newSection);
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Added ISSUE LIST header above filter buttons');
    
    console.log('✅ Added ISSUE LIST header above the filter buttons!');
}

addIssueListHeader().catch(console.error);