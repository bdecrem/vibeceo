#!/usr/bin/env node

/**
 * Collect Edit Requests
 * Gathers pending edit requests from the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Load pending edit requests
 * Modified to support worker mode with proper input handling
 */
async function collectEditRequests() {
  console.log('📥 Collecting pending edit requests...');
  
  // Check if we're in worker mode (single edit passed via env)
  if (process.env.WORKER_INPUT) {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(process.env.WORKER_INPUT, 'utf-8');
      const requests = JSON.parse(data);
      console.log(`📝 Worker mode: Processing ${requests.length} pre-claimed edit(s)`);
      return requests;
    } catch (error) {
      console.error('Error reading worker input:', error);
      return [];
    }
  }
  
  try {
    // Normal mode: Query for pending edit requests from database
    const { data: requests, error } = await supabase
      .from('wtaf_revisions')
      .select(`
        *,
        wtaf_content!inner(
          user_slug,
          app_slug,
          html_content
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1); // Process only 1 at a time when not in worker mode
    
    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        console.log('ℹ️  Revisions table does not exist yet');
        console.log('   Run database migration first or wait for first --revise command');
        return [];
      }
      throw error;
    }
    
    if (!requests || requests.length === 0) {
      console.log('ℹ️  No pending edit requests found');
      return [];
    }
    
    console.log(`📝 Found ${requests.length} pending edit request(s)`);
    
    // Mark requests as processing
    const requestIds = requests.map(r => r.id);
    const { error: updateError } = await supabase
      .from('wtaf_revisions')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .in('id', requestIds);
    
    if (updateError) {
      console.error('Error updating request status:', updateError);
    }
    
    // Log summary
    requests.forEach(req => {
      const appSlug = req.wtaf_content?.app_slug || 'unknown';
      console.log(`  📝 ${appSlug}: "${req.edit_request.substring(0, 50)}..."`);
    });
    
    // Save to temp file for next stage
    const fs = await import('fs/promises');
    const tempFile = path.join(__dirname, '.pending-edits.json');
    await fs.writeFile(tempFile, JSON.stringify(requests, null, 2));
    
    return requests;
    
  } catch (error) {
    console.error('❌ Error collecting edit requests:', error);
    process.exit(1);
  }
}

/**
 * Check if content exists and get its type
 */
async function validateContent(contentId) {
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('id, html_content, type, current_revision')
    .eq('id', contentId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  let htmlContent = data.html_content;
  
  // Load current revision HTML if it exists (for stacking edits)
  if (data.current_revision !== null) {
    console.log(`  🔄 Loading current revision ${data.current_revision} for stacking`);
    
    const { data: revisionData, error: revisionError } = await supabase
      .from('wtaf_revisions')
      .select('html_content')
      .eq('content_id', data.id)
      .eq('revision_id', data.current_revision)
      .eq('status', 'completed')
      .single();

    if (revisionError) {
      console.log(`  ⚠️  Failed to load revision ${data.current_revision}, using original`);
    } else if (revisionData?.html_content) {
      console.log(`  ✅ Using revision ${data.current_revision} HTML for stacking`);
      htmlContent = revisionData.html_content;
    }
  }
  
  // Detect app type from HTML content (use current revision content)
  let appType = 'standard';
  if (htmlContent.includes('/api/zad/')) {
    appType = 'zad';
  } else if (htmlContent.includes('requestAnimationFrame') && htmlContent.includes('canvas')) {
    appType = 'game';
  } else if (htmlContent.includes('<form') && htmlContent.includes('submit')) {
    appType = 'form';
  }
  
  return {
    ...data,
    html_content: htmlContent, // Use the current revision content
    detectedType: appType
  };
}

// Main execution
async function main() {
  console.log('🎨 Webtoys Edit Agent - Collection Phase');
  console.log('=' + '='.repeat(50));
  
  const requests = await collectEditRequests();
  
  if (requests.length > 0) {
    // Validate each request has valid content
    console.log('\n🔍 Validating content existence...');
    
    for (const request of requests) {
      const content = await validateContent(request.content_id);
      if (!content) {
        console.log(`  ❌ ${request.content_id}: Content not found`);
        
        // Mark as failed
        await supabase
          .from('wtaf_revisions')
          .update({
            status: 'failed',
            error_message: 'Content not found'
          })
          .eq('id', request.id);
      } else {
        console.log(`  ✅ ${request.content_id}: ${content.detectedType} app found`);
        request.content = content; // Attach for processing
      }
    }
    
    // Filter out failed validations
    const validRequests = requests.filter(r => r.content);
    
    if (validRequests.length > 0) {
      // Update temp file with validated requests
      const fs = await import('fs/promises');
      const tempFile = path.join(__dirname, '.pending-edits.json');
      await fs.writeFile(tempFile, JSON.stringify(validRequests, null, 2));
      
      console.log(`\n✅ ${validRequests.length} valid edit request(s) ready for processing`);
      process.exit(0);
    } else {
      console.log('\n⚠️  No valid edit requests to process');
      process.exit(1);
    }
  } else {
    process.exit(1); // No requests = failure for pipeline
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}