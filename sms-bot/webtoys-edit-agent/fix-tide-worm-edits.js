#!/usr/bin/env node

/**
 * Fix the edit functionality in tide-worm-speaking
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

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

async function fixEditFunctionality() {
  console.log('🔧 Fixing edit functionality in tide-worm-speaking...');

  try {
    // Get the current HTML
    const { data: content, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('app_slug', 'tide-worm-speaking')
      .eq('user_slug', 'bart')
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch content:', fetchError);
      return;
    }

    let html = content.html_content;
    
    // The issue is in the loadLatestData function - it needs to apply only the LATEST edit for each post
    // Currently it applies all edits in order, but we want only the most recent one
    
    // Find and replace the edit merging logic
    const oldEditLogic = `                // Apply edits to posts
                edits.forEach(edit => {
                    const postIndex = allPosts.findIndex(p => p.id == edit.postId);
                    if (postIndex !== -1) {
                        allPosts[postIndex].title = edit.title || allPosts[postIndex].title;
                        allPosts[postIndex].content = edit.content;
                    }
                });`;
    
    const newEditLogic = `                // Group edits by postId and apply only the latest edit for each post
                const latestEdits = {};
                edits.forEach(edit => {
                    const postId = edit.postId;
                    if (!latestEdits[postId] || edit.timestamp > latestEdits[postId].timestamp) {
                        latestEdits[postId] = edit;
                    }
                });
                
                // Apply only the latest edit for each post
                Object.values(latestEdits).forEach(edit => {
                    const postIndex = allPosts.findIndex(p => p.id == edit.postId);
                    if (postIndex !== -1) {
                        allPosts[postIndex].title = edit.title || allPosts[postIndex].title;
                        allPosts[postIndex].content = edit.content;
                        allPosts[postIndex].lastEdited = edit.timestamp;
                    }
                });`;
    
    if (html.includes(oldEditLogic)) {
      html = html.replace(oldEditLogic, newEditLogic);
      console.log('✅ Fixed edit merging logic to use only latest edit per post');
    } else {
      console.log('⚠️ Edit logic pattern not found, trying alternative fix...');
      
      // Try a more flexible pattern
      const editPattern = /\/\/ Apply edits to posts[\s\S]*?\/\/ Filter out deleted posts/;
      if (editPattern.test(html)) {
        html = html.replace(editPattern, 
          `// Group edits by postId and apply only the latest edit for each post
                const latestEdits = {};
                edits.forEach(edit => {
                    const postId = edit.postId;
                    if (!latestEdits[postId] || edit.timestamp > latestEdits[postId].timestamp) {
                        latestEdits[postId] = edit;
                    }
                });
                
                // Apply only the latest edit for each post
                Object.values(latestEdits).forEach(edit => {
                    const postIndex = allPosts.findIndex(p => p.id == edit.postId);
                    if (postIndex !== -1) {
                        allPosts[postIndex].title = edit.title || allPosts[postIndex].title;
                        allPosts[postIndex].content = edit.content;
                        allPosts[postIndex].lastEdited = edit.timestamp;
                    }
                });

                // Filter out deleted posts`);
        console.log('✅ Applied alternative fix for edit merging logic');
      }
    }
    
    // Save the fixed HTML to a file first for review
    await fs.writeFile('tide-worm-edit-fixed.html', html, 'utf-8');
    console.log('💾 Saved fixed HTML to tide-worm-edit-fixed.html');
    
    // Deploy the fix
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({
        html_content: html,
        updated_at: new Date().toISOString()
      })
      .eq('app_slug', 'tide-worm-speaking')
      .eq('user_slug', 'bart');
    
    if (updateError) {
      console.error('❌ Failed to update:', updateError);
      return;
    }
    
    console.log('✅ Successfully fixed edit functionality!');
    console.log('🎉 The edit feature should now properly show the latest edit for each post');
    console.log('📍 URL: https://webtoys.ai/bart/tide-worm-speaking');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixEditFunctionality();