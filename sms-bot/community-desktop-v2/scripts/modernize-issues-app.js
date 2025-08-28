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

async function modernizeIssuesApp() {
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
    const backupPath = path.join(__dirname, '..', 'backups', `toybox-issue-tracker_${timestamp}.html`);
    
    // Ensure backups directory exists
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Save backup
    fs.writeFileSync(backupPath, data.html_content);
    console.log(`📁 Backup saved to: ${backupPath}`);
    
    // Also save as latest backup for easy restore
    const latestBackupPath = path.join(__dirname, '..', 'backups', 'toybox-issue-tracker_latest-backup.html');
    fs.writeFileSync(latestBackupPath, data.html_content);
    console.log(`📁 Latest backup saved to: ${latestBackupPath}`);
    
    // Now update the styling
    let html = data.html_content;
    
    // Find the style section and update it
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/;
    const currentStyle = html.match(styleRegex);
    
    if (!currentStyle) {
        console.error('❌ Could not find style section in Issues app');
        return;
    }
    
    // Create the new modern, playful style
    const newStyle = `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            min-height: 100vh;
            padding: 0;
            margin: 0;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-radius: 0 0 25px 25px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #764ba2;
            font-size: 28px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 10px;
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        
        .tab-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .tab-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .tab-button.active {
            background: white;
            color: #764ba2;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        .issue-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .form-group label {
            color: #764ba2;
            font-weight: 600;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .submit-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
            align-self: flex-start;
        }
        
        .submit-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
        }
        
        .submit-button:active {
            transform: translateY(0);
        }
        
        .issues-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .issue-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .issue-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
            border-color: #667eea;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .issue-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .issue-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-open {
            background: #e8f5e9;
            color: #2e7d32;
        }
        
        .status-completed {
            background: #e3f2fd;
            color: #1565c0;
        }
        
        .status-processing {
            background: #fff3e0;
            color: #ef6c00;
        }
        
        .status-failed {
            background: #ffebee;
            color: #c62828;
        }
        
        .issue-description {
            color: #555;
            line-height: 1.6;
            margin-bottom: 12px;
        }
        
        .issue-metadata {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #888;
        }
        
        .priority-badge {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .priority-low {
            background: #f0f0f0;
            color: #666;
        }
        
        .priority-medium {
            background: #fff9c4;
            color: #f57c00;
        }
        
        .priority-high {
            background: #ffcdd2;
            color: #d32f2f;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #888;
        }
        
        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #764ba2;
            font-size: 18px;
        }
        
        .auth-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 20px;
            backdrop-filter: blur(5px);
        }
        
        .auth-status {
            color: white;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .auth-button {
            background: white;
            color: #764ba2;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .auth-button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .issue-card {
            animation: slideIn 0.3s ease;
        }
        
        /* Comments section styling */
        .comments-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #f0f0f0;
        }
        
        .comment {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 10px;
        }
        
        .comment-author {
            font-weight: 600;
            color: #764ba2;
            margin-bottom: 5px;
        }
        
        .comment-text {
            color: #555;
            line-height: 1.5;
        }
        
        .comment-timestamp {
            font-size: 11px;
            color: #999;
            margin-top: 5px;
        }
        
        /* Agent response styling */
        .agent-response {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 10px;
            margin-top: 10px;
        }
        
        .agent-response-label {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 8px;
        }
    </style>`;
    
    // Replace the old style with the new one
    html = html.replace(styleRegex, newStyle);
    
    // Update the database with the new HTML
    console.log('🚀 Updating Issues app with modern styling...');
    
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
    
    console.log('✅ Issues app successfully updated with modern, playful styling!');
    console.log('🌐 View at: https://webtoys.ai/public/toybox-issue-tracker');
    console.log('📁 Backup saved at:', backupPath);
    console.log('\n💡 To restore if needed, run:');
    console.log(`   node scripts/restore-issues-app.js "${latestBackupPath}"`);
}

modernizeIssuesApp().catch(console.error);