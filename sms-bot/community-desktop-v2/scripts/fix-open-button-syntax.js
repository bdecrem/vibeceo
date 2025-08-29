#!/usr/bin/env node

/**
 * Fix OPEN button syntax error
 * 
 * Fixes the syntax error in the button rendering logic
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
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

async function fixSyntax() {
    console.log('🔧 Fixing OPEN button syntax error...\n');
    
    // Fetch current Issue Tracker
    console.log('📥 Fetching current Issue Tracker...');
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        console.error('❌ Failed to fetch:', error.message);
        return;
    }
    
    let html = data.html_content;
    
    // Fix the broken button syntax
    const brokenCode = `Status: \${status.toUpperCase()}\${data.closedBy ? \` (closed by \${data.closedBy})\` : ''}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    (status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        status === 'pending' ?
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` :
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\`
                                    ) : 
                                    ''
                                })">CLOSE</button>\` : 
                                    ''
                                }`;
    
    const fixedCode = `Status: \${status.toUpperCase()}\${data.closedBy ? \` (closed by \${data.closedBy})\` : ''}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    (status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        status === 'pending' ?
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` :
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\`
                                    ) : 
                                    ''
                                }`;
    
    html = html.replace(brokenCode, fixedCode);
    
    // Also remove duplicate styles
    // Remove the duplicate open-button styles (keep only one set)
    const duplicateStylePattern = /\.open-button \{[^}]+\}\s*\.open-button:hover \{[^}]+\}\s*\.open-button:active \{[^}]+\}/g;
    const matches = html.match(duplicateStylePattern);
    if (matches && matches.length > 1) {
        // Keep first occurrence, remove others
        const firstMatch = matches[0];
        html = html.replace(duplicateStylePattern, '');
        // Re-insert the first match at the original position (after close-button styles)
        const closeButtonEnd = html.indexOf('.close-button:active {');
        if (closeButtonEnd > -1) {
            const insertPoint = html.indexOf('}', closeButtonEnd) + 1;
            html = html.slice(0, insertPoint) + '\n        ' + firstMatch + html.slice(insertPoint);
        }
    }
    
    // Update in database
    console.log('📤 Updating in database...');
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
        console.error('❌ Update failed:', updateError.message);
        return;
    }
    
    console.log('✅ Fixed syntax error in OPEN button!');
    console.log('🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
}

fixSyntax().catch(console.error);