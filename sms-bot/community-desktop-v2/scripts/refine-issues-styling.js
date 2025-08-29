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

async function refineIssuesStyling() {
    console.log('🔍 Fetching current Issues app from database...');
    
    // Fetch the current Issues app
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error || !data) {
        console.error('❌ Error fetching Issues app:', error);
        return;
    }
    
    console.log('✅ Issues app fetched successfully');
    
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(__dirname, '..', 'backups', `toybox-issue-tracker_${timestamp}_before_refinement.html`);
    
    // Ensure backups directory exists
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Save backup
    fs.writeFileSync(backupPath, data.html_content);
    console.log(`📁 Backup saved to: ${backupPath}`);
    
    // Also save as latest backup for easy restore
    const latestBackupPath = path.join(__dirname, '..', 'backups', 'toybox-issue-tracker_latest-backup-before-refinement.html');
    fs.writeFileSync(latestBackupPath, data.html_content);
    
    // Now update the content
    let html = data.html_content;
    
    // 1. Remove the white box with X and - controls (window controls at top)
    // This appears to be window controls in a header that we don't need
    // Look for patterns that might be window controls
    html = html.replace(/<div[^>]*class="window-controls"[^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<div[^>]*class="title-bar"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // 2. Remove "System Status" title if it exists
    html = html.replace(/>System Status</g, '><');
    html = html.replace(/<h1[^>]*>System Status<\/h1>/gi, '');
    html = html.replace(/<h2[^>]*>System Status<\/h2>/gi, '');
    
    // 3. Change the background to very soft pastel blue (10% saturation)
    // Very soft pastel blue: hsl(210, 10%, 95%) or #f0f2f5 with slight blue tint
    // Or we can use: linear-gradient(135deg, #f5f8fc 0%, #e8f0f7 100%) for subtle variation
    
    // Find the body style and update it
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/;
    const styleMatch = html.match(styleRegex);
    
    if (styleMatch) {
        let styles = styleMatch[1];
        
        // Update the body background - change from bright gradient to very soft pastel
        styles = styles.replace(
            /body\s*\{[^}]*background:\s*linear-gradient[^;]*;/gi,
            'body {\n            background: linear-gradient(135deg, #f5f8fc 0%, #eef3f8 100%);'
        );
        
        // Also update if it's just a solid background
        styles = styles.replace(
            /body\s*\{[^}]*background:\s*[^;]*;/gi,
            'body {\n            background: linear-gradient(135deg, #f5f8fc 0%, #eef3f8 100%);'
        );
        
        // Make sure header background is softer too
        styles = styles.replace(
            /\.header\s*\{[^}]*\}/g,
            `.header {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            border-radius: 0 0 20px 20px;
            margin-bottom: 20px;
        }`
        );
        
        // Update any bright purple/blue colors to be softer
        styles = styles.replace(/#667eea/g, '#8b9dc3'); // Softer blue
        styles = styles.replace(/#764ba2/g, '#9b8ba3'); // Softer purple
        
        // Make the gradient buttons softer
        styles = styles.replace(
            /background:\s*linear-gradient\(135deg,\s*#667eea\s*0%,\s*#764ba2\s*100%\)/g,
            'background: linear-gradient(135deg, #8b9dc3 0%, #9b8ba3 100%)'
        );
        
        // Put the updated styles back
        html = html.replace(styleRegex, `<style>${styles}</style>`);
    }
    
    // Remove any standalone window control elements that might exist in the HTML
    html = html.replace(/<div[^>]*id="window-controls"[^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<div[^>]*class="controls"[^>]*>\s*<button[^>]*>X<\/button>\s*<button[^>]*>-<\/button>[\s\S]*?<\/div>/gi, '');
    
    // Update the database with the refined HTML
    console.log('🚀 Updating Issues app with refined styling...');
    
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
        console.error('❌ Error updating Issues app:', updateError);
        console.log('💡 You can restore from backup using:');
        console.log(`   node scripts/restore-issues-app.js "${latestBackupPath}"`);
        return;
    }
    
    console.log('✅ Issues app successfully refined!');
    console.log('🎨 Changes made:');
    console.log('   - Removed window control box');
    console.log('   - Removed System Status title');
    console.log('   - Changed background to soft pastel blue (10% saturation)');
    console.log('🌐 View at: https://webtoys.ai/public/toybox-issue-tracker');
    console.log('📁 Backup saved at:', backupPath);
    console.log('\n💡 To restore if needed, run:');
    console.log(`   node scripts/restore-issues-app.js "${latestBackupPath}"`);
}

refineIssuesStyling().catch(console.error);