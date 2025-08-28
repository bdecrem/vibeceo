#!/usr/bin/env node

/**
 * Fix the OPEN/CLOSE button logic for admin bart
 * Current broken logic: Shows OPEN for closed/pending, CLOSE for open
 * Fixed logic: Shows CLOSE for non-closed issues, OPEN for closed issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Import safe wrapper
import { safeUpdateToyBoxIssueTracker } from './safe-wrapper-issues.js';

async function fixCloseButton() {
    console.log('🔧 Fixing CLOSE button logic for Issues tracker...');
    
    // Fetch current HTML from database
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        console.error('Failed to fetch Issues tracker:', error);
        process.exit(1);
    }
    
    let html = data.html_content;
    
    // Find and fix the button logic
    // Current broken logic:
    // (status === 'closed' || status === 'completed' ? OPEN : 
    //  status === 'pending' ? OPEN : CLOSE)
    
    // Fixed logic should be:
    // If status is 'closed' or 'completed' -> show OPEN button
    // Otherwise (open, pending, etc) -> show CLOSE button
    
    const oldButtonLogic = `${currentUser && currentUser.handle === 'bart' ? 
                                    (status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        status === 'pending' ?
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` :
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\`
                                    ) : 
                                    ''
                                }`;
    
    const newButtonLogic = `${currentUser && currentUser.handle === 'bart' ? 
                                    (status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\`
                                    ) : 
                                    ''
                                }`;
    
    // Use a more specific search pattern
    const searchPattern = /\$\{currentUser && currentUser\.handle === 'bart' \?[\s\S]*?\n\s*''\s*\}/;
    
    if (!searchPattern.test(html)) {
        console.error('Could not find button logic in HTML');
        process.exit(1);
    }
    
    // Replace with fixed logic
    html = html.replace(searchPattern, newButtonLogic);
    
    // Use safe wrapper to update
    await safeUpdateToyBoxIssueTracker(html, 'Fixed CLOSE button to show for non-closed issues');
    
    console.log('✅ CLOSE button logic fixed! Now shows CLOSE for open/pending issues, OPEN for closed issues.');
}

fixCloseButton().catch(console.error);