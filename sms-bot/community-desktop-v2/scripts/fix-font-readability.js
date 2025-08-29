#!/usr/bin/env node

/**
 * Fix font readability while maintaining System 7 aesthetic
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

async function fixFontReadability() {
    try {
        console.log('🔧 Fixing font readability for System 7 Issue Tracker...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_font_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Update the font stack and styling for better readability
        // Keep Chicago for headers but use more readable fonts for body text
        const stylePattern = /<style>[\s\S]*?<\/style>/;
        const currentStyle = html.match(stylePattern)[0];
        
        // Create improved styles with better readability
        const improvedStyle = `<style>
        @import url('https://fonts.googleapis.com/css2?family=Chicago:wght@400&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Geneva, 'Lucida Grande', 'Trebuchet MS', Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            background: #808080;
            background-image: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                #909090 2px,
                #909090 4px
            );
            padding: 20px;
            color: #000000;
            -webkit-font-smoothing: auto;
            font-smooth: never;
        }
        
        /* Main window */
        .mac-window {
            background: #c0c0c0;
            border: 2px solid #000000;
            border-style: outset;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
            max-width: 900px;
            margin: 0 auto;
        }
        
        /* Title bar - keep Chicago for authentic feel */
        .title-bar {
            background: linear-gradient(to bottom, #ffffff 0%, #c0c0c0 100%);
            border-bottom: 2px solid #000000;
            padding: 2px;
            display: flex;
            align-items: center;
            font-family: Chicago, Geneva, sans-serif;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        
        .title-bar-buttons {
            display: flex;
            gap: 6px;
            margin-right: 10px;
        }
        
        .title-bar-button {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            background: #c0c0c0;
            font-size: 10px;
            line-height: 10px;
            text-align: center;
            cursor: pointer;
            font-family: Geneva, sans-serif;
        }
        
        .title-bar-button:active {
            background: #808080;
        }
        
        .window-content {
            padding: 10px;
        }
        
        /* Headers - Chicago for authenticity but larger for readability */
        h2, h3 {
            font-family: Chicago, Geneva, sans-serif;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        h2 {
            font-size: 14px;
        }
        
        h3 {
            font-size: 13px;
        }
        
        /* System status box */
        .system-status {
            background: #ffffff;
            border: 2px solid #000000;
            border-style: inset;
            padding: 8px;
            margin-bottom: 15px;
            font-family: Geneva, 'Lucida Grande', sans-serif;
            font-size: 11px;
        }
        
        .system-status div {
            margin-bottom: 2px;
        }
        
        /* Filter tabs */
        .filter-tabs {
            display: flex;
            gap: 0;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
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
        
        /* Form section */
        .form-section {
            background: #ffffff;
            border: 2px solid #000000;
            border-style: inset;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .form-section h3 {
            font-family: Chicago, Geneva, sans-serif;
            font-size: 13px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        
        /* Admin banner */
        .admin-banner {
            background: #000000;
            color: #00ff00;
            padding: 5px;
            text-align: center;
            font-family: 'Courier New', Monaco, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
        
        /* Form elements */
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-family: Geneva, sans-serif;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        input[type="text"],
        select,
        textarea {
            width: 100%;
            padding: 4px;
            border: 2px solid #000000;
            border-style: inset;
            background: #ffffff;
            font-family: Geneva, 'Lucida Grande', sans-serif;
            font-size: 12px;
            line-height: 1.3;
        }
        
        textarea {
            min-height: 80px;
            resize: vertical;
        }
        
        select {
            cursor: pointer;
            padding: 5px;
        }
        
        /* Buttons */
        button {
            background: #c0c0c0;
            border: 2px solid #000000;
            border-style: outset;
            padding: 6px 15px;
            font-family: Geneva, sans-serif;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
        }
        
        button:active {
            border-style: inset;
            background: #808080;
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Issues list */
        #recentUpdates {
            background: #ffffff;
            border: 2px solid #000000;
            border-style: inset;
            padding: 15px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .issue-item {
            background: #f0f0f0;
            border: 1px solid #000000;
            padding: 10px;
            margin-bottom: 10px;
            font-family: Geneva, 'Lucida Grande', sans-serif;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            align-items: center;
        }
        
        .issue-meta {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .issue-number {
            background: #000000;
            color: #ffffff;
            padding: 2px 6px;
            font-family: 'Courier New', Monaco, monospace;
            font-size: 11px;
            font-weight: bold;
        }
        
        .issue-type {
            padding: 2px 6px;
            border: 1px solid #000;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        
        .issue-type.type-fix { background: #90EE90; }
        .issue-type.type-feature { background: #87CEEB; }
        .issue-type.type-update { background: #FFE4B5; }
        .issue-type.type-bug { background: #FFB6C1; }
        
        .issue-submitter {
            font-weight: bold;
            color: #0000FF;
        }
        
        .issue-submitter.anonymous {
            color: #808080;
            font-style: italic;
        }
        
        .issue-description {
            margin: 8px 0;
            padding: 5px;
            background: #ffffff;
            border: 1px solid #c0c0c0;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .issue-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 8px;
            border-top: 1px dotted #808080;
            margin-top: 8px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .issue-status.status-pending { color: #FF8C00; }
        .issue-status.status-closed { color: #008000; }
        .issue-status.status-completed { color: #008000; }
        
        .close-button {
            padding: 3px 8px;
            font-size: 10px;
            background: #ff6b6b;
            color: white;
            border-color: #cc0000;
        }
        
        .close-button:active {
            background: #cc0000;
        }
        
        /* Info text */
        #lastIssueInfo, #currentUserInfo {
            margin: 5px 0;
            font-family: Geneva, sans-serif;
            font-size: 11px;
            font-weight: bold;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 16px;
        }
        
        ::-webkit-scrollbar-track {
            background: #c0c0c0;
            border: 1px solid #000;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #808080;
            border: 2px solid #c0c0c0;
            border-style: outset;
        }
        
        ::-webkit-scrollbar-thumb:active {
            background: #404040;
            border-style: inset;
        }
    </style>`;
        
        // Replace the style section
        html = html.replace(stylePattern, improvedStyle);
        
        console.log('✅ Updated font styling for better readability');
        console.log('   • Headers: Chicago for authenticity, larger size');
        console.log('   • Body text: Geneva/Lucida Grande for clarity');
        console.log('   • Improved line-height and spacing');
        console.log('   • Better contrast and text sizing');
        
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
        
        console.log('\n🎉 Font readability improved!');
        console.log('\n📋 What was changed:');
        console.log('  • Body text: Geneva/Lucida Grande (more readable)');
        console.log('  • Headers: Chicago for authentic Mac feel');
        console.log('  • Better font sizes and line spacing');
        console.log('  • Maintained System 7 aesthetic');
        
        console.log('\n🔄 Refresh to see the improvements:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixFontReadability();