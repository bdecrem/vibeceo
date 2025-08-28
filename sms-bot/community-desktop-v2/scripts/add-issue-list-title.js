#!/usr/bin/env node

/**
 * Add "ISSUE LIST" title above the filter buttons
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function addIssueListTitle() {
    console.log('🔧 Adding ISSUE LIST title above filter buttons...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Find the filter section and add ISSUE LIST above it
    const filterSection = `<div style="margin-top: 15px; padding: 10px; background: #e8e8e8; border: 1px solid #999;">
                        <div style="display: flex; gap: 5px; justify-content: center;">`;
    
    const withTitle = `<h3 style="text-align: center; margin-top: 20px; margin-bottom: 10px; font-size: 16px; font-weight: bold;">ISSUE LIST</h3>
                    <div style="margin-top: 15px; padding: 10px; background: #e8e8e8; border: 1px solid #999;">
                        <div style="display: flex; gap: 5px; justify-content: center;">`;
    
    if (html.includes(withTitle)) {
        console.log('ISSUE LIST title already exists');
        return;
    }
    
    if (html.includes(filterSection)) {
        html = html.replace(filterSection, withTitle);
        console.log('✅ Added ISSUE LIST title');
    } else {
        console.log('⚠️ Could not find filter section');
    }
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Added ISSUE LIST title above filter buttons');
    
    console.log('✅ Added ISSUE LIST title above the filter buttons!');
}

addIssueListTitle().catch(console.error);