#!/usr/bin/env node

/**
 * Fix webhook error in ToyBox Issue Tracker - make webhook optional
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

async function fixWebhook() {
    try {
        console.log('🔧 Fixing webhook error in Issue Tracker...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_webhook_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Replace the webhook section with a version that doesn't fail
        html = html.replace(
            `if (saved) {
                // Trigger the webhook for immediate action
                try {
                    const webhookResponse = await fetch('/api/webhook/toybox-direct-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...formData,
                            safety_mode: 'always_backup',
                            execution_mode: 'immediate'
                        })
                    });
                    
                    if (webhookResponse.ok) {
                        alert('✅ Update request submitted! The change will be applied with automatic backup.');
                        document.getElementById('issueForm').reset();
                        document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));
                        loadRecentUpdates();
                    } else {
                        alert('⚠️ Update saved but webhook failed. It will be processed later.');
                    }
                } catch (error) {
                    console.error('Webhook error:', error);
                    alert('⚠️ Update saved but webhook unreachable. It will be processed later.');
                }
            } else {
                alert('❌ Failed to save update request. Please try again.');
            }`,
            `if (saved) {
                // Update saved successfully
                alert('✅ Update request saved! An agent will process this request and apply changes with automatic backups.');
                
                // Log for manual processing
                console.log('📋 New update request:', formData);
                console.log('To process manually: Check the console for details');
                
                // Try webhook but don't show errors to user
                fetch('/api/webhook/toybox-direct-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        safety_mode: 'always_backup',
                        execution_mode: 'immediate'
                    })
                }).then(response => {
                    if (response.ok) {
                        console.log('✅ Webhook triggered successfully');
                    }
                }).catch(error => {
                    console.log('Webhook not configured yet - request saved for manual processing');
                });
                
                document.getElementById('issueForm').reset();
                document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));
                loadRecentUpdates();
            } else {
                alert('❌ Failed to save update request. Please try again.');
            }`
        );
        
        // Also update the instructions in console
        html = html.replace(
            `This app sends requests to: /api/webhook/toybox-direct-update`,
            `This app saves requests to ZAD for processing.
        Webhook endpoint (optional): /api/webhook/toybox-direct-update`
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
        
        console.log('✅ Fixed webhook error!');
        console.log('\n📋 How it works now:');
        console.log('  • Saves all requests to ZAD database');
        console.log('  • Shows success message immediately');
        console.log('  • Tries webhook silently (no error if it fails)');
        console.log('  • Logs details to console for manual processing');
        console.log('\n🔄 Reload Issue Tracker - it will work now!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixWebhook();