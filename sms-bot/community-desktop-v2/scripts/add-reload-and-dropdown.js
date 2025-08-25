#!/usr/bin/env node

/**
 * Add reload icon and convert action type to dropdown menu
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function addReloadAndDropdown() {
    try {
        console.log('🔄 Adding reload icon and dropdown menu...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_ui_update_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Add reload icon styles
        html = html.replace(
            `.header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }`,
            `.header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .reload-button {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .reload-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(180deg);
        }
        
        .reload-button svg {
            width: 20px;
            height: 20px;
            fill: white;
        }`
        );
        
        // Add reload button to header
        html = html.replace(
            `<div class="header">
            <h1>🚀 ToyBox OS Direct Updates</h1>`,
            `<div class="header">
            <button class="reload-button" onclick="location.reload()" title="Reload">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
            </button>
            <h1>🚀 ToyBox OS Direct Updates</h1>`
        );
        
        // Replace the action type grid with dropdown
        html = html.replace(
            `<div class="form-group">
                    <label for="actionType">What needs to be done?</label>
                    <div class="action-type">
                        <div class="action-option" data-type="fix">
                            🔧 Fix Bug
                        </div>
                        <div class="action-option" data-type="feature">
                            ✨ Add Feature
                        </div>
                        <div class="action-option" data-type="update">
                            📝 Update App
                        </div>
                        <div class="action-option" data-type="rollback">
                            ↩️ Rollback Change
                        </div>
                    </div>
                    <input type="hidden" id="actionType" name="actionType" required>
                </div>`,
            `<div class="form-group">
                    <label for="actionType">What needs to be done?</label>
                    <select id="actionType" name="actionType" required>
                        <option value="fix" selected>🔧 Fix Bug</option>
                        <option value="feature">✨ Add Feature</option>
                        <option value="update">📝 Update App</option>
                        <option value="rollback">↩️ Rollback Change</option>
                    </select>
                </div>`
        );
        
        // Remove the old action type CSS that's no longer needed
        html = html.replace(
            `.action-type {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 8px;
        }
        
        .action-option {
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .action-option:hover {
            border-color: #667eea;
            background: #f5f5ff;
        }
        
        .action-option.selected {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        
        `,
            ''
        );
        
        // Remove the old action type JavaScript
        html = html.replace(
            `// Action type selection
        document.querySelectorAll('.action-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('actionType').value = option.dataset.type;
            });
        });
        
        `,
            ''
        );
        
        // Also remove the reset of action options after form submission
        html = html.replace(
            `document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));`,
            ''
        );
        
        // Update the form reset to keep the dropdown
        html = html.replace(
            `document.getElementById('issueForm').reset();
                `,
            `document.getElementById('issueForm').reset();
                document.getElementById('actionType').value = 'fix'; // Reset to default
                `
        );
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('✅ UI updates complete!');
        console.log('\n🎨 Changes made:');
        console.log('  • Added reload icon (↻) in upper right corner');
        console.log('  • Converted action type to dropdown menu');
        console.log('  • "Fix Bug" is now the default selection');
        console.log('  • Cleaner, more compact form layout');
        console.log('\n🔄 Reload Issue Tracker to see the changes!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addReloadAndDropdown();