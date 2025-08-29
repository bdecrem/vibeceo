#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixStringifiedContent() {
    console.log('🔧 Fixing stringified content_data in webtoys_issue_tracker_data...\n');
    
    // Get all records with stringified content_data
    const { data: issues, error: fetchError } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('app_id', 'toybox-issue-tracker-v3');
    
    if (fetchError) {
        console.error('❌ Error fetching issues:', fetchError);
        return;
    }
    
    console.log(`Found ${issues.length} issues to check\n`);
    
    let fixedCount = 0;
    
    for (const issue of issues) {
        // Check if content_data is a string
        if (typeof issue.content_data === 'string') {
            try {
                // Parse the stringified JSON
                const parsed = JSON.parse(issue.content_data);
                
                console.log(`Fixing issue #${issue.id}: ${parsed.title || 'No title'}`);
                
                // Update with proper JSONB
                const { error: updateError } = await supabase
                    .from('webtoys_issue_tracker_data')
                    .update({ content_data: parsed })
                    .eq('id', issue.id);
                
                if (updateError) {
                    console.error(`  ❌ Failed to update issue #${issue.id}:`, updateError);
                } else {
                    console.log(`  ✅ Fixed issue #${issue.id}`);
                    fixedCount++;
                }
            } catch (parseError) {
                console.error(`  ❌ Failed to parse content_data for issue #${issue.id}:`, parseError);
            }
        } else {
            console.log(`✓ Issue #${issue.id} already has proper JSONB content_data`);
        }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} issues with stringified content_data`);
}

fixStringifiedContent().catch(console.error);