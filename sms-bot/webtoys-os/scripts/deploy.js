#!/usr/bin/env node

/**
 * Deploy WebtoysOS v3 to test or production
 * 
 * Usage:
 *   node deploy.js --test     # Deploy to toybox-os-v3-test
 *   node deploy.js --prod     # Deploy to toybox-os (CAREFUL!)
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

// Parse command line arguments
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const isProd = args.includes('--prod');

if (!isTest && !isProd) {
    console.error('❌ Please specify --test or --prod');
    console.error('   Example: node deploy.js --test');
    process.exit(1);
}

if (isProd) {
    console.warn('⚠️  WARNING: You are about to deploy to PRODUCTION (toybox-os)');
    console.warn('⚠️  This will replace the current working desktop!');
    console.warn('⚠️  Are you sure? Type "yes" to continue:');
    
    // Simple confirmation for production
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    readline.question('', (answer) => {
        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Deployment cancelled');
            process.exit(0);
        }
        readline.close();
        deploy();
    });
} else {
    deploy();
}

async function deploy() {
    const targetSlug = isTest ? 'toybox-os-v3-test' : 'toybox-os';
    console.log(`\n🚀 Deploying WebtoysOS v3 to: ${targetSlug}`);
    
    // Read the desktop HTML
    const desktopPath = path.join(__dirname, '../core/desktop-v3.html');
    if (!fs.existsSync(desktopPath)) {
        console.error('❌ Desktop HTML not found at:', desktopPath);
        process.exit(1);
    }
    
    const htmlContent = fs.readFileSync(desktopPath, 'utf8');
    console.log(`📄 Read desktop HTML (${htmlContent.length} bytes)`);
    
    // Check if app already exists
    const { data: existing, error: checkError } = await supabase
        .from('wtaf_content')
        .select('id, created_at')
        .eq('user_slug', 'public')
        .eq('app_slug', targetSlug)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing app:', checkError);
        process.exit(1);
    }
    
    const timestamp = new Date().toISOString();
    
    if (existing) {
        // Update existing app
        console.log('📝 Updating existing app...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: timestamp,
                original_prompt: 'WebtoysOS v3 - Modern Desktop Environment'
            })
            .eq('id', existing.id);
        
        if (updateError) {
            console.error('❌ Failed to update app:', updateError);
            process.exit(1);
        }
        
        console.log('✅ Successfully updated!');
    } else {
        // Create new app
        console.log('📝 Creating new app...');
        
        // Get theme ID from v2
        let themeId = null;
        const { data: v2Data } = await supabase
            .from('wtaf_content')
            .select('theme_id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')
            .single();
        
        if (v2Data && v2Data.theme_id) {
            themeId = v2Data.theme_id;
            console.log('📎 Using theme from v2:', themeId);
        }
        
        const { error: insertError } = await supabase
            .from('wtaf_content')
            .insert({
                user_slug: 'public',
                app_slug: targetSlug,
                html_content: htmlContent,
                original_prompt: 'WebtoysOS v3 - Modern Desktop Environment',
                theme_id: themeId,
                created_at: timestamp,
                updated_at: timestamp
            });
        
        if (insertError) {
            console.error('❌ Failed to create app:', insertError);
            process.exit(1);
        }
        
        console.log('✅ Successfully created!');
    }
    
    // Success message
    console.log('\n🎉 Deployment complete!');
    console.log('📍 View your desktop at:');
    
    if (isTest) {
        console.log('   Local: http://localhost:3000/public/toybox-os-v3-test');
        console.log('   Live:  https://webtoys.ai/public/toybox-os-v3-test');
    } else {
        console.log('   Local: http://localhost:3000/public/toybox-os');
        console.log('   Live:  https://webtoys.ai/public/toybox-os');
    }
    
    console.log('\n💡 Tips:');
    console.log('   - Test on mobile devices');
    console.log('   - Check authentication works');
    console.log('   - Try opening apps in windows');
    console.log('   - Test drag and drop');
    
    if (isTest) {
        console.log('\n📋 Next steps:');
        console.log('   1. Test thoroughly at test URL');
        console.log('   2. Get feedback from users');
        console.log('   3. When ready, deploy to production with: node deploy.js --prod');
    }
}