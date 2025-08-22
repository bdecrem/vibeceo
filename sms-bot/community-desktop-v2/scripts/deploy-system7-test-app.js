#!/usr/bin/env node

/**
 * Deploy a test System 7 windowed app to verify the theme works correctly
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateWindowedApp } from '../process-windowed-apps.js';

dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deployTestSystem7App() {
  console.log('🎨 Deploying test System 7 windowed app...');
  
  try {
    // Create a mock submission for testing
    const testSubmission = {
      appName: 'System 7 Paint',
      appFunction: 'A simple paint program that lets you draw with different tools and colors, just like the classic Mac paint programs from 1991',
      appIcon: '🎨',
      appSlug: 'system7-paint-test',
      submitterName: 'System Test',
      id: 'test-system7-paint'
    };
    
    console.log('📝 Test submission:', testSubmission);
    
    // Generate the windowed app
    console.log('🤖 Generating app with Claude...');
    const appSpec = await generateWindowedApp(testSubmission);
    
    if (!appSpec) {
      console.error('❌ Failed to generate app');
      return false;
    }
    
    console.log('✅ App generated successfully:', appSpec.name);
    console.log('🎯 Theme ID:', appSpec.theme_id);
    console.log('📄 HTML length:', appSpec.html_content?.length || 0);
    
    // Check if app already exists
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', 'community')
      .eq('app_slug', appSpec.slug)
      .single();

    if (existing) {
      console.log('📱 App already exists, updating...');
      
      // Update existing app
      const { error } = await supabase
        .from('wtaf_content')
        .update({
          html_content: appSpec.html_content,
          theme_id: appSpec.theme_id,
          original_prompt: appSpec.originalRequest,
          updated_at: new Date()
        })
        .eq('user_slug', 'community')
        .eq('app_slug', appSpec.slug);

      if (error) {
        console.error('❌ Error updating app:', error);
        return false;
      }
    } else {
      console.log('📱 Creating new app...');
      
      // Create new app
      const { error } = await supabase
        .from('wtaf_content')
        .insert({
          user_slug: 'community',
          app_slug: appSpec.slug,
          html_content: appSpec.html_content,
          theme_id: appSpec.theme_id,
          original_prompt: appSpec.originalRequest,
          type: 'ZAD',
          status: 'published',
          coach: 'System 7 Test',
          created_at: new Date()
        });

      if (error) {
        console.error('❌ Error creating app:', error);
        return false;
      }
    }
    
    console.log('🎉 Test System 7 app deployed successfully!');
    console.log('🌐 URL: https://webtoys.ai/community/' + appSpec.slug);
    console.log('🎨 This app should display with perfect System 7 styling');
    
    // Show some HTML preview
    console.log('\n📄 HTML Preview (first 500 chars):');
    console.log('-'.repeat(50));
    console.log(appSpec.html_content?.substring(0, 500) || 'No HTML content');
    console.log('-'.repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting System 7 test app deployment...');
  
  const success = await deployTestSystem7App();
  
  if (success) {
    console.log('✨ Test deployment completed successfully!');
    console.log('🏛️ The app should display with museum-quality System 7 styling');
  } else {
    console.log('💥 Test deployment failed');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);