#!/usr/bin/env node

/**
 * Fix case sensitivity for BART username - allow 'bart', 'BART', 'Bart', etc.
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

async function fixCaseSensitivity() {
    try {
        console.log('🔧 Fixing BART case sensitivity issue...');
        
        // Fetch current Fixit Board
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `fixit-board_before_case_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        console.log('Fixing username comparisons to be case-insensitive...');
        
        // Fix all BART username checks to be case-insensitive
        // Replace username === 'BART' with username.toUpperCase() === 'BART'
        
        // Fix in user display
        html = html.replace(
            `if (username === 'BART') {`,
            `if (username && username.toUpperCase() === 'BART') {`
        );
        
        // Fix in close ticket function
        html = html.replace(
            `if (username !== 'BART') {`,
            `if (!username || username.toUpperCase() !== 'BART') {`
        );
        
        // Fix in issue display for close button
        html = html.replace(
            `(window.toyboxUser?.username === 'BART' || window.toyboxUser === 'BART')`,
            `(window.toyboxUser && (
                        (typeof window.toyboxUser === 'string' && window.toyboxUser.toUpperCase() === 'BART') ||
                        (window.toyboxUser.username && window.toyboxUser.username.toUpperCase() === 'BART')
                    ))`
        );
        
        // Fix in checkBartStatus function
        html = html.replace(
            `if (username === 'BART') {`,
            `if (username && username.toUpperCase() === 'BART') {`
        );
        
        // Add a helper function to check if user is BART
        html = html.replace(
            `// ToyBox OS compatibility and authentication`,
            `// Helper function to check if user is BART (case-insensitive)
        function isBart() {
            const user = window.toyboxUser;
            if (!user) return false;
            
            const username = typeof user === 'string' ? user : user.username;
            return username && username.toUpperCase() === 'BART';
        }
        
        // ToyBox OS compatibility and authentication`
        );
        
        // Update all remaining checks to use the helper
        html = html.replace(
            `const username = window.toyboxUser?.username || window.toyboxUser;
                    if (username && username.toUpperCase() === 'BART') {`,
            `const username = window.toyboxUser?.username || window.toyboxUser;
                    if (isBart()) {`
        );
        
        // Fix the close button check again with the helper
        html = html.replace(
            `(window.toyboxUser && (
                        (typeof window.toyboxUser === 'string' && window.toyboxUser.toUpperCase() === 'BART') ||
                        (window.toyboxUser.username && window.toyboxUser.username.toUpperCase() === 'BART')
                    ))`,
            `isBart()`
        );
        
        // Fix checkBartStatus to use helper
        html = html.replace(
            `function checkBartStatus() {
            const username = window.toyboxUser?.username || window.toyboxUser;
            const bartMessage = document.getElementById('bartMessage');
            if (bartMessage) {
                if (username && username.toUpperCase() === 'BART') {`,
            `function checkBartStatus() {
            const bartMessage = document.getElementById('bartMessage');
            if (bartMessage) {
                if (isBart()) {`
        );
        
        // Fix closeTicket to use helper
        html = html.replace(
            `const username = window.toyboxUser?.username || window.toyboxUser;
            
            if (!username || username.toUpperCase() !== 'BART') {`,
            `if (!isBart()) {`
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
        
        console.log('✅ Case sensitivity fixed!');
        console.log('\n🎉 Now accepts all variations:');
        console.log('  • bart ✅');
        console.log('  • BART ✅');
        console.log('  • Bart ✅');
        console.log('  • BaRt ✅ (any case combination)');
        console.log('\n🔄 Reload Fixit Board - should work with "bart" now!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixCaseSensitivity();