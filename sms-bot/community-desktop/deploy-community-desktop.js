#!/usr/bin/env node

/**
 * Deploy Community Desktop to WEBTOYS
 * Creates both the submission form and desktop viewer as WEBTOYS pages
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ZAD helper functions that will be injected
const zadHelpers = `
<script>
// ZAD Helper Functions for Community Desktop
window.APP_ID = 'community-desktop-apps';

async function save(dataType, data) {
  try {
    const response = await fetch('/api/zad/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: window.APP_ID,
        action_type: dataType,
        content_data: data
      })
    });
    
    if (!response.ok) throw new Error('Save failed');
    return await response.json();
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}

async function load(dataType) {
  try {
    const response = await fetch('/api/zad/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: window.APP_ID,
        action_type: dataType
      })
    });
    
    if (!response.ok) throw new Error('Load failed');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Load error:', error);
    return [];
  }
}
</script>
`;

async function deploySubmissionForm() {
  console.log('\n📝 Deploying submission form...');
  
  // Read the submission form HTML
  const htmlPath = path.join(__dirname, 'community-desktop-submit.html');
  let html = await fs.readFile(htmlPath, 'utf-8');
  
  // Replace the mock ZAD functions with real ones
  const mockStart = '// ZAD helper functions (injected by the system)';
  const mockEnd = '// Form handling';
  
  const startIdx = html.indexOf(mockStart);
  const endIdx = html.indexOf(mockEnd);
  
  if (startIdx !== -1 && endIdx !== -1) {
    // Remove the mock functions and localStorage code
    const beforeMock = html.substring(0, startIdx);
    const afterMock = html.substring(endIdx);
    
    // Insert real ZAD helpers before the closing </body>
    html = beforeMock + afterMock;
    html = html.replace('</body>', zadHelpers + '</body>');
    
    // Fix the form submission to use real save function
    html = html.replace(
      '// For now, save to localStorage for testing',
      '// Save to database via ZAD'
    );
    html = html.replace(
      /localStorage\.setItem\([^)]+\);/g,
      '// localStorage removed - using ZAD'
    );
    html = html.replace(
      /localStorage\.getItem\([^)]+\)/g,
      '[]'
    );
  }
  
  // Create/update the WEBTOYS page
  const { data: existing } = await supabase
    .from('wtaf_content')
    .select('*')
    .eq('app_slug', 'community-desktop-submit')
    .eq('user_slug', 'bart')
    .single();
  
  const pageData = {
    user_slug: 'bart',
    app_slug: 'community-desktop-submit',
    html_content: html,
    original_prompt: 'Community Desktop - App Submission Form',
    coach: 'community-desktop',
    type: 'ZAD',
    status: 'published'
  };
  
  if (existing) {
    const { error } = await supabase
      .from('wtaf_content')
      .update(pageData)
      .eq('id', existing.id);
    
    if (error) throw error;
    console.log('✅ Updated submission form at: webtoys.ai/bart/community-desktop-submit');
  } else {
    const { error } = await supabase
      .from('wtaf_content')
      .insert(pageData);
    
    if (error) throw error;
    console.log('✅ Created submission form at: webtoys.ai/bart/community-desktop-submit');
  }
  
  return true;
}

async function deployDesktop() {
  console.log('\n🖥️  Deploying desktop viewer...');
  
  // Read desktop.html
  const htmlPath = path.join(__dirname, 'desktop.html');
  let html = await fs.readFile(htmlPath, 'utf-8');
  
  // Update the Add App button to point to the deployed form
  html = html.replace(
    "window.open('https://webtoys.ai/community-desktop-submit', '_blank')",
    "window.open('https://webtoys.ai/bart/community-desktop-submit', '_blank')"
  );
  
  // Update the Start button too
  html = html.replace(
    'onclick="window.open(\'https://webtoys.ai/community-desktop-submit\', \'_blank\')"',
    'onclick="window.open(\'https://webtoys.ai/bart/community-desktop-submit\', \'_blank\')"'
  );
  
  // Create/update the WEBTOYS page
  const { data: existing } = await supabase
    .from('wtaf_content')
    .select('*')
    .eq('app_slug', 'community-desktop')
    .eq('user_slug', 'bart')
    .single();
  
  const pageData = {
    user_slug: 'bart',
    app_slug: 'community-desktop',
    html_content: html,
    original_prompt: 'Community Desktop - A collaborative computer built by everyone',
    coach: 'community-desktop',
    type: 'WEB',
    status: 'published'
  };
  
  if (existing) {
    const { error } = await supabase
      .from('wtaf_content')
      .update(pageData)
      .eq('id', existing.id);
    
    if (error) throw error;
    console.log('✅ Updated desktop at: webtoys.ai/bart/community-desktop');
  } else {
    const { error } = await supabase
      .from('wtaf_content')
      .insert(pageData);
    
    if (error) throw error;
    console.log('✅ Created desktop at: webtoys.ai/bart/community-desktop');
  }
  
  return true;
}

async function createZADApp() {
  console.log('\n🗄️  Setting up ZAD app...');
  
  // Check if ZAD app exists
  const { data: existing } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', 'community-desktop-apps')
    .limit(1);
  
  if (!existing || existing.length === 0) {
    // Create initial ZAD record to establish the app
    const { error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: 'community-desktop-apps',
        action_type: 'config',
        content_data: {
          created_at: new Date().toISOString(),
          description: 'Community Desktop app submissions',
          status: 'active'
        }
      });
    
    if (error) throw error;
    console.log('✅ Created ZAD app: community-desktop-apps');
  } else {
    console.log('✅ ZAD app already exists: community-desktop-apps');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 COMMUNITY DESKTOP DEPLOYMENT');
  console.log('='.repeat(60));
  
  try {
    // 1. Create ZAD app if needed
    await createZADApp();
    
    // 2. Deploy submission form
    await deploySubmissionForm();
    
    // 3. Deploy desktop viewer
    await deployDesktop();
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Deployment complete!');
    console.log('='.repeat(60));
    console.log('\n📍 Your pages are live at:');
    console.log('   Desktop: https://webtoys.ai/bart/community-desktop');
    console.log('   Submit:  https://webtoys.ai/bart/community-desktop-submit');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit the submission form and add an app');
    console.log('   2. Wait 2 minutes (or run: node monitor.js)');
    console.log('   3. Check the desktop to see your app appear!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { deploySubmissionForm, deployDesktop, createZADApp };