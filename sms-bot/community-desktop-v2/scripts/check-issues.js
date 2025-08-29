#!/usr/bin/env node

/**
 * Check for issues with admin comments to test the fix
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkIssues() {
    console.log('🔍 Checking for issues with admin comments...');
    
    try {
        const { data, error } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-direct-updates')
            .eq('action_type', 'update_request')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('❌ Error:', error);
            return;
        }
        
        console.log(`📊 Found ${data.length} issues total`);
        
        // Check each issue for admin comments
        data.forEach((issue, index) => {
            const content = typeof issue.content_data === 'string' 
                ? JSON.parse(issue.content_data) 
                : issue.content_data;
                
            console.log(`\n--- Issue #${content.issueNumber || index + 1} ---`);
            console.log(`Status: ${content.status || 'unknown'}`);
            console.log(`Description: ${(content.description || 'No description').substring(0, 100)}...`);
            
            if (content.admin_comments && content.admin_comments.length > 0) {
                console.log(`💬 Has ${content.admin_comments.length} admin comments:`);
                content.admin_comments.forEach((comment, i) => {
                    console.log(`  ${i + 1}. ${comment.author} (${comment.authorRole}): ${comment.text.substring(0, 100)}...`);
                });
            } else {
                console.log('🔇 No admin comments');
            }
            
            if (content.resolution) {
                console.log(`✅ Resolution: ${content.resolution}`);
            }
            
            if (content.edit_agent_output) {
                console.log(`🤖 Edit Agent Output: ${content.edit_agent_output.substring(0, 100)}...`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkIssues();