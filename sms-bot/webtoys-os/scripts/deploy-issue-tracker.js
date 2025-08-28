#!/usr/bin/env node

/**
 * Deploy Issue Tracker v3 to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
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

async function deploy() {
    console.log('🚀 Deploying Issue Tracker v3...\n');
    
    // Read the issue tracker HTML
    const htmlPath = path.join(__dirname, '../apps/issue-tracker-v3.html');
    if (!fs.existsSync(htmlPath)) {
        console.error('Issue tracker HTML not found at:', htmlPath);
        process.exit(1);
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    console.log(`📄 Read HTML (${htmlContent.length} bytes)`);
    
    // Check if exists
    const { data: existing, error: checkError } = await supabase
        .from('wtaf_content')
        .select('id, created_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker-v3')
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing app:', checkError);
        process.exit(1);
    }
    
    const timestamp = new Date().toISOString();
    
    if (existing) {
        // Update existing
        console.log('📝 Updating existing issue tracker...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: timestamp,
                original_prompt: 'Modern Issue Tracker v3 with UPDATE logic for WebtoysOS'
            })
            .eq('id', existing.id);
        
        if (updateError) {
            console.error('Failed to update:', updateError);
            process.exit(1);
        }
        
        console.log('✅ Updated successfully!');
    } else {
        // Create new
        console.log('📝 Creating new issue tracker...');
        
        const { error: insertError } = await supabase
            .from('wtaf_content')
            .insert({
                user_slug: 'public',
                app_slug: 'toybox-issue-tracker-v3',
                html_content: htmlContent,
                original_prompt: 'Modern Issue Tracker v3 with UPDATE logic for WebtoysOS',
                created_at: timestamp,
                updated_at: timestamp
            });
        
        if (insertError) {
            console.error('Failed to create:', insertError);
            process.exit(1);
        }
        
        console.log('✅ Created successfully!');
    }
    
    console.log('\n🎉 Deployment complete!');
    console.log('📍 View your issue tracker at:');
    console.log('   Local: http://localhost:3000/public/toybox-issue-tracker-v3');
    console.log('   Live:  https://webtoys.ai/public/toybox-issue-tracker-v3');
    console.log('\n💡 Key features:');
    console.log('   - UPDATE logic instead of INSERT (no duplicates)');
    console.log('   - Modern responsive design');
    console.log('   - Real-time comment system');
    console.log('   - User authentication integration');
    console.log('   - Mobile-friendly interface');
}

deploy().catch(console.error);