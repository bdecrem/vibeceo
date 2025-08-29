#!/usr/bin/env node

/**
 * Test System 7 Windowed App Creation
 * Creates a simple notepad app to test the System 7 theme styling
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateWindowedApp } from '../process-windowed-apps.js';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../../.env' });
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSystem7WindowedApp() {
  console.log('\n=== Testing System 7 Windowed App Creation ===');
  
  // Create a test submission for a simple notepad app
  const testSubmission = {
    appName: 'System 7 Notepad Test',
    appFunction: 'A simple notepad application for writing and saving text documents',
    appSlug: 'sys7-notepad-test',
    submitterName: 'System Test',
    appIcon: '📝'
  };

  console.log('Generating test app:', testSubmission.appName);

  try {
    // Generate the windowed app
    const appSpec = await generateWindowedApp(testSubmission);
    
    if (!appSpec) {
      console.error('❌ Failed to generate app');
      return;
    }

    console.log('✅ App generated successfully!');
    console.log('Theme ID:', appSpec.theme_id);
    console.log('App Slug:', appSpec.slug);
    
    // Check if the HTML includes the proper body class
    const hasThemeClass = appSpec.html_content.includes('class="theme-system7 windowed-app"');
    console.log('Has System 7 theme class:', hasThemeClass ? '✅' : '❌');
    
    // Extract just the body tag to verify
    const bodyMatch = appSpec.html_content.match(/<body[^>]*>/i);
    if (bodyMatch) {
      console.log('Body tag:', bodyMatch[0]);
    }

    // Save the HTML to a test file for inspection
    const fs = await import('fs');
    const testPath = './test-system7-app.html';
    fs.writeFileSync(testPath, appSpec.html_content);
    console.log(`Test HTML saved to: ${testPath}`);

    // Deploy to test
    console.log('\nDeploying test app...');
    
    // Check if app already exists
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', 'community')
      .eq('app_slug', appSpec.slug)
      .single();

    if (existing) {
      console.log('Test app already exists, updating...');
      const { error } = await supabase
        .from('wtaf_content')
        .update({
          html_content: appSpec.html_content,
          theme_id: appSpec.theme_id,
          updated_at: new Date()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('❌ Error updating app:', error);
      } else {
        console.log(`✅ Test app updated: /community/${appSpec.slug}`);
      }
    } else {
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
          coach: 'ToyBox OS Test',
          created_at: new Date()
        });

      if (error) {
        console.error('❌ Error deploying app:', error);
      } else {
        console.log(`✅ Test app deployed: /community/${appSpec.slug}`);
      }
    }

    console.log(`\n🌐 View the test app at: https://webtoys.ai/community/${appSpec.slug}`);
    
  } catch (error) {
    console.error('❌ Error testing windowed app:', error);
  }
}

// Run the test
testSystem7WindowedApp().catch(console.error);