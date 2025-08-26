#!/usr/bin/env node

/**
 * Check how many issues exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function checkIssues() {
    try {
        console.log('📊 Checking issues in database...\n');
        
        const { data: allRecords } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'update_request')
            .order('created_at', { ascending: false });
        
        if (allRecords && allRecords.length > 0) {
            console.log(`Total records: ${allRecords.length}`);
            
            // Group by issue number
            const issueMap = new Map();
            allRecords.forEach(record => {
                const num = record.content_data?.issueNumber;
                if (num) {
                    if (!issueMap.has(num)) {
                        issueMap.set(num, []);
                    }
                    issueMap.get(num).push(record);
                }
            });
            
            console.log(`Unique issues: ${issueMap.size}\n`);
            
            // Show each issue
            const sortedIssues = Array.from(issueMap.keys()).sort((a, b) => a - b);
            sortedIssues.forEach(num => {
                const records = issueMap.get(num);
                const latest = records[0].content_data;
                console.log(`Issue #${num}:`);
                console.log(`  Records: ${records.length}`);
                console.log(`  Status: ${latest.status || 'pending'}`);
                console.log(`  Submitted by: ${latest.submittedBy || 'unknown'}`);
                console.log(`  Target: ${latest.target}`);
                if (records.length > 1) {
                    console.log(`  ⚠️  Has ${records.length - 1} duplicate record(s)`);
                }
            });
        } else {
            console.log('No issues found in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkIssues();