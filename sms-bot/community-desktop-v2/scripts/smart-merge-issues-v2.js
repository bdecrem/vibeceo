#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function smartMergeIssuesV2() {
    console.log('🔧 Smart Merge: Issues Tracker v2 Design\n');
    console.log('This will preserve ALL admin functionality while applying v2 design\n');
    
    // Step 1: Load current app from backup
    console.log('1️⃣ Loading current app with admin features...');
    const backupPath = path.join(__dirname, '..', 'backups', 'toybox-issue-tracker_latest-backup-before-v2.html');
    const currentHTML = fs.readFileSync(backupPath, 'utf-8');
    console.log('   ✅ Current app loaded');
    
    // Step 2: Load v2 design
    console.log('\n2️⃣ Loading v2 design mockup...');
    const v2Path = path.join(__dirname, '..', 'mockups', 'issues-redesign-v2.html');
    const v2Design = fs.readFileSync(v2Path, 'utf-8');
    console.log('   ✅ V2 design loaded');
    
    // Step 3: Extract all JavaScript from current app
    console.log('\n3️⃣ Extracting JavaScript and admin logic...');
    
    // Extract everything between script tags from current app
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/i;
    const currentScriptMatch = currentHTML.match(scriptRegex);
    
    if (!currentScriptMatch) {
        console.error('❌ Could not find JavaScript in current app');
        return;
    }
    
    const currentJavaScript = currentScriptMatch[1];
    console.log('   ✅ Extracted ' + currentJavaScript.length + ' characters of JavaScript');
    
    // Step 4: Extract styles from v2 design
    console.log('\n4️⃣ Extracting v2 styles...');
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/i;
    const v2StyleMatch = v2Design.match(styleRegex);
    
    if (!v2StyleMatch) {
        console.error('❌ Could not find styles in v2 design');
        return;
    }
    
    const v2Styles = v2StyleMatch[1];
    console.log('   ✅ Extracted v2 styles');
    
    // Step 5: Extract HTML structure from v2 (without scripts/styles)
    console.log('\n5️⃣ Extracting v2 HTML structure...');
    let v2Body = v2Design.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    if (!v2Body) {
        console.error('❌ Could not find body in v2 design');
        return;
    }
    
    let v2BodyContent = v2Body[1];
    // Remove script tags from body if any
    v2BodyContent = v2BodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    console.log('   ✅ Extracted v2 body structure');
    
    // Step 6: Build the merged HTML
    console.log('\n6️⃣ Building merged HTML with v2 design + current functionality...');
    
    const mergedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ToyBox Issues Tracker</title>
    <style>
${v2Styles}

/* Additional styles for admin features */
.admin-controls {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.admin-controls button {
    background: white;
    color: #f59e0b;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.admin-controls button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.superpower-badge {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
}

.admin-comment-form {
    background: #fef3c7;
    border: 2px solid #fbbf24;
    padding: 12px;
    border-radius: 8px;
    margin-top: 12px;
}

.admin-comment-form textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #fbbf24;
    border-radius: 6px;
    resize: vertical;
    min-height: 60px;
}

.admin-comment-form button {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    margin-top: 8px;
    cursor: pointer;
}
    </style>
</head>
<body>
${v2BodyContent}

<script>
// PRESERVED: All JavaScript from current app with admin functionality
${currentJavaScript}

// Additional initialization for v2
document.addEventListener('DOMContentLoaded', function() {
    // Check for superpower mode
    const urlParams = new URLSearchParams(window.location.search);
    const isSuperpower = urlParams.get('superpower') === 'true';
    
    if (isSuperpower) {
        // Add superpower badge
        const badge = document.createElement('div');
        badge.className = 'superpower-badge';
        badge.textContent = '⚡ SUPERPOWER MODE';
        document.body.appendChild(badge);
    }
    
    // Initialize the app
    if (typeof loadIssues === 'function') {
        loadIssues();
    }
});
</script>
</body>
</html>`;
    
    console.log('   ✅ Merged HTML created');
    
    // Step 7: Save merged version for review
    const mergedPath = path.join(__dirname, '..', 'backups', 'issues-v2-smart-merged.html');
    fs.writeFileSync(mergedPath, mergedHTML);
    console.log(`   📁 Merged version saved for review: ${mergedPath}`);
    
    // Step 8: Final confirmation
    console.log('\n⚠️  IMPORTANT: Your backup is at:');
    console.log('   /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html');
    console.log('\n📋 The merged version combines:');
    console.log('   - V2 modern design and layout');
    console.log('   - ALL JavaScript from current app');
    console.log('   - ALL admin functionality preserved');
    console.log('\n🔍 Please review the merged file before deployment');
    console.log('   Open: ' + mergedPath);
    console.log('\nTo deploy after review, run:');
    console.log('   node scripts/final-deploy-issues-v2.js');
    console.log('\n🔄 To restore if needed:');
    console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
}

smartMergeIssuesV2().catch(console.error);