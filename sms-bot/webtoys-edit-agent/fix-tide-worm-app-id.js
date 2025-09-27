#!/usr/bin/env node

/**
 * Fix the APP_ID in tide-worm-speaking to match its actual database row
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAppId() {
  console.log('🔧 Fixing APP_ID in tide-worm-speaking...');

  try {
    // Get the current HTML
    const { data: content, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('id, html_content')
      .eq('app_slug', 'tide-worm-speaking')
      .eq('user_slug', 'bart')
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch content:', fetchError);
      return;
    }

    console.log('📍 Current database row ID:', content.id);
    
    // The app is now using the azure-gannet row (9b3c0388-a785-4aec-a1c1-c10cd76574b7)
    // But the HTML still references the old tide-worm ID (016d77c4-fd74-462f-bc4b-12b709e6abd2)
    
    // Since the APP_ID is already correct (9b3c0388-a785-4aec-a1c1-c10cd76574b7),
    // and the app works except for edits, let's check what's happening
    
    // Actually, looking at the HTML, the APP_ID IS already set to 9b3c0388-a785-4aec-a1c1-c10cd76574b7
    // So the issue might be something else
    
    console.log('✅ APP_ID is already correct:', '9b3c0388-a785-4aec-a1c1-c10cd76574b7');
    console.log('');
    console.log('🔍 The edit issue might be related to:');
    console.log('  1. Edit functionality expecting old post IDs');
    console.log('  2. Timing issue with data refresh after edit');
    console.log('');
    console.log('Let me check the edit data...');
    
    // Check recent edits
    const { data: edits, error: editError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', '9b3c0388-a785-4aec-a1c1-c10cd76574b7')
      .eq('action_type', 'edit')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (edits && edits.length > 0) {
      console.log('\n📝 Recent edits found:');
      edits.forEach(edit => {
        console.log(`  - Post ${edit.content_data.postId}: "${edit.content_data.title || 'No title'}" by ${edit.content_data.author}`);
      });
    }
    
    // Check if posts exist
    const { data: posts, error: postError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', '9b3c0388-a785-4aec-a1c1-c10cd76574b7')
      .eq('action_type', 'post')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (posts && posts.length > 0) {
      console.log('\n📄 Recent posts found:');
      posts.forEach(post => {
        console.log(`  - ID ${post.id}: "${post.content_data.title || 'No title'}" by ${post.content_data.author}`);
      });
    }
    
    console.log('\n💡 The issue is that edits are being saved but not displayed.');
    console.log('This is likely because the edit merging logic uses post.id');
    console.log('but the edits reference postId which might not match.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAppId();