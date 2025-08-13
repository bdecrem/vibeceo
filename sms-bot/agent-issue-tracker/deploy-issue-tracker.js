#!/usr/bin/env node

/**
 * Deploy Issue Tracker App directly to Supabase
 * Creates or updates the issue tracker as a ZAD app
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deployIssueTracker() {
  console.log('🚀 Deploying Issue Tracker App to Supabase...\n');

  try {
    // Read the HTML file
    const htmlPath = join(__dirname, 'issue-tracker-zad-app.html');
    const html = await readFile(htmlPath, 'utf-8');
    
    // Configuration
    const userSlug = 'bart'; // Your user slug
    const appSlug = 'issue-tracker'; // New app slug
    const appId = '83218c2e-281e-4265-a95f-1d3f763870d4'; // Use the existing issue tracker app ID
    
    // HTML already has correct APP_ID, no need to replace
    const updatedHtml = html;
    
    // Check if app already exists
    const { data: existing, error: checkError } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();

    if (existing && !checkError) {
      // Update existing app
      console.log('📝 Updating existing issue-tracker app...');
      
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({
          html_content: updatedHtml,
          type: 'ZAD',
          updated_at: new Date().toISOString()
        })
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Updated existing app successfully!');
    } else {
      // Create new app
      console.log('📝 Creating new issue-tracker app...');
      
      const { error: insertError } = await supabase
        .from('wtaf_content')
        .insert({
          user_slug: userSlug,
          app_slug: appSlug,
          html_content: updatedHtml,
          type: 'ZAD',
          original_prompt: 'Issue tracker app for collecting and processing bug reports and feature requests',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Created new app successfully!');
      console.log(`📌 App UUID: ${appId}`);
      
      // Update .env.local with the new app ID
      console.log('\n⚠️  Update your .env.local file:');
      console.log(`ISSUE_TRACKER_APP_ID=${appId}`);
    }

    console.log('\n🎉 Deployment complete!');
    console.log(`📱 Visit: https://webtoys.me/${userSlug}/${appSlug}`);
    console.log(`    or: https://wtaf.me/${userSlug}/${appSlug}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    
    if (error.message?.includes('uuid')) {
      console.log('\n💡 Note: You may need to install uuid package:');
      console.log('   npm install uuid');
    }
  }
}

// Alternative: Clone existing app
async function cloneApp(sourceSlug, targetSlug) {
  console.log(`🔄 Cloning ${sourceSlug} to ${targetSlug}...`);
  
  try {
    // Get source app
    const { data: source, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('*')
      .eq('user_slug', 'bart')
      .eq('app_slug', sourceSlug)
      .single();

    if (fetchError) {
      throw new Error(`Source app not found: ${sourceSlug}`);
    }

    // Read the issue tracker HTML
    const htmlPath = join(__dirname, 'issue-tracker-zad-app.html');
    const html = await readFile(htmlPath, 'utf-8');
    
    // Use the source app's UUID (for shared data) or generate new one
    const appId = source.app_id || uuidv4();
    
    // Update HTML with correct app ID
    const updatedHtml = html.replace(
      "window.APP_ID = 'turquoise-rabbit-exploring';",
      `window.APP_ID = '${appId}';`
    );

    // Create new app with issue tracker HTML
    const { error: insertError } = await supabase
      .from('wtaf_content')
      .insert({
        ...source,
        app_slug: targetSlug,
        html_content: updatedHtml,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      // If exists, update instead
      if (insertError.code === '23505') { // Unique violation
        const { error: updateError } = await supabase
          .from('wtaf_content')
          .update({
            html_content: updatedHtml,
            type: 'ZAD',
            updated_at: new Date().toISOString()
          })
          .eq('user_slug', 'bart')
          .eq('app_slug', targetSlug);

        if (updateError) throw updateError;
        console.log('✅ Updated existing app with issue tracker!');
      } else {
        throw insertError;
      }
    } else {
      console.log('✅ Created new issue tracker app!');
    }

    console.log(`\n📱 Visit: https://webtoys.me/bart/${targetSlug}`);
    console.log(`📌 App ID: ${appId}`);
    console.log('\n⚠️  Update your .env.local:');
    console.log(`ISSUE_TRACKER_APP_ID=${appId}`);

  } catch (error) {
    console.error('❌ Clone failed:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args[0] === 'clone' && args[1]) {
  // Clone mode: node deploy-issue-tracker.js clone turquoise-rabbit-exploring issue-tracker
  cloneApp(args[1], args[2] || 'issue-tracker');
} else {
  // Default: Create new app
  deployIssueTracker();
}