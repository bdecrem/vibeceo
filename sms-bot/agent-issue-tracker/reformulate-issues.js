#!/usr/bin/env node

/**
 * Issue Reformulation Agent
 * Reads raw issues from ZAD, reformulates them into actionable tickets
 * Runs every 2 hours via cron
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from sms-bot directory (parent of agent-issue-tracker)
// IMPORTANT: Use override:true to replace any shell environment variables
const envPath = path.resolve(__dirname, '..', '.env.local');
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

// Verify we got the right values
if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'your_supabase_url_here') {
  console.error('Error: Invalid SUPABASE_URL in', envPath);
  console.error('Make sure sms-bot/.env.local exists and contains valid SUPABASE_URL');
  process.exit(1);
}

const execAsync = promisify(exec);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Issue tracker app ID (can be configured)
const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker';

/**
 * Load issues from ZAD with specific status
 */
async function loadIssues(status = 'new') {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');

  if (error) {
    console.error('Error loading issues:', error);
    return [];
  }

  // Filter by status in content_data
  return data.filter(record => {
    const content = record.content_data || {};
    return content.status === status || (!content.status && status === 'new');
  });
}

/**
 * Update an issue in ZAD
 */
async function updateIssue(recordId, updates) {
  // First get the current record
  const { data: current, error: fetchError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    console.error('Error fetching issue:', fetchError);
    return false;
  }

  // Merge updates into content_data
  const updatedContent = {
    ...current.content_data,
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Update the record
  const { error: updateError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .update({ 
      content_data: updatedContent,
      updated_at: new Date()
    })
    .eq('id', recordId);

  if (updateError) {
    console.error('Error updating issue:', updateError);
    return false;
  }

  return true;
}

/**
 * Use Claude to reformulate an issue
 */
async function reformulateWithClaude(issue) {
  const prompt = `
You are helping reformulate user-submitted issues for the WEBTOYS project into clear, actionable tickets.

Original submission:
"${issue.idea}"

Author: ${issue.author}
Category: ${issue.category || 'uncategorized'}

Please reformulate this into:
1. A clear, actionable description (1-2 sentences)
2. Specific acceptance criteria (what needs to be done)
3. Affected components/files if identifiable
4. Confidence level (high/medium/low) based on clarity

If the request is too vague, unclear, or not actionable, mark confidence as "low" and explain what additional information is needed.

Format your response as JSON:
{
  "reformulated": "Clear description of what needs to be done",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "affected_components": ["component1", "component2"],
  "confidence": "high|medium|low",
  "needs_clarification": "What additional info is needed (if confidence is low)"
}
`;

  try {
    // Create a temporary file with the prompt to avoid shell escaping issues
    const tempFile = path.join('/tmp', `issue-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    // Use Claude via command line, reading from file to avoid escaping issues
    const { stdout } = await execAsync(
      `cat "${tempFile}" | claude --print --output-format json`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

    // Parse Claude's response wrapper
    const claudeResponse = JSON.parse(stdout);
    
    // Extract the actual result from Claude's response
    if (claudeResponse.result) {
      // Try to parse the JSON from Claude's text response
      try {
        // Claude's result field contains the text response, which should be JSON
        const jsonMatch = claudeResponse.result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing Claude result as JSON:', parseError);
      }
    }
    
    // Fallback if parsing fails
    return {
      reformulated: issue.idea,
      confidence: 'low',
      needs_clarification: 'Could not parse AI response'
    };
  } catch (error) {
    console.error('Error calling Claude:', error);
    return {
      reformulated: issue.idea,
      confidence: 'low',
      needs_clarification: 'Failed to process with AI',
      error: error.message
    };
  }
}

/**
 * Categorize issue based on content
 */
function categorizeIssue(reformulated) {
  const text = reformulated.reformulated.toLowerCase();
  
  if (text.includes('bug') || text.includes('error') || text.includes('fix')) {
    return 'bug';
  } else if (text.includes('feature') || text.includes('add') || text.includes('new')) {
    return 'feature';
  } else if (text.includes('improve') || text.includes('enhance') || text.includes('update')) {
    return 'enhancement';
  } else if (text.includes('docs') || text.includes('documentation')) {
    return 'documentation';
  }
  
  return 'triage';
}

/**
 * Main processing function
 */
async function processIssues() {
  console.log('🤖 Issue Reformulation Agent starting...');
  console.log(`📅 ${new Date().toISOString()}`);
  
  // Load new issues
  const newIssues = await loadIssues('new');
  console.log(`📥 Found ${newIssues.length} new issues to process`);

  let processed = 0;
  let failed = 0;

  for (const record of newIssues) {
    const issue = record.content_data;
    console.log(`\n🔍 Processing issue #${record.id}: "${issue.idea}"`);

    try {
      // Reformulate with Claude
      const reformulated = await reformulateWithClaude(issue);
      
      // Auto-categorize if needed
      if (!issue.category || issue.category === 'triage') {
        reformulated.category = categorizeIssue(reformulated);
      }

      // Update the issue
      const success = await updateIssue(record.id, {
        status: 'reformulated',
        reformulated: reformulated.reformulated,
        acceptance_criteria: reformulated.acceptance_criteria,
        affected_components: reformulated.affected_components,
        confidence: reformulated.confidence,
        needs_clarification: reformulated.needs_clarification,
        category: reformulated.category || issue.category,
        reformulated_at: new Date().toISOString()
      });

      if (success) {
        console.log(`✅ Successfully reformulated with ${reformulated.confidence} confidence`);
        processed++;
      } else {
        console.log(`❌ Failed to update issue`);
        failed++;
      }

    } catch (error) {
      console.error(`❌ Error processing issue:`, error);
      failed++;
      
      // Mark as needing manual review
      await updateIssue(record.id, {
        status: 'error',
        error: error.message,
        needs_manual_review: true
      });
    }

    // Rate limiting - be nice to Claude
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n📊 Processing complete:`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${newIssues.length}`);

  // Also check for issues needing re-evaluation (optional)
  const lowConfidenceIssues = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue')
    .filter('content_data->confidence', 'eq', 'low')
    .filter('content_data->status', 'eq', 'reformulated')
    .limit(5);

  if (lowConfidenceIssues.data?.length > 0) {
    console.log(`\n⚠️  ${lowConfidenceIssues.data.length} low-confidence issues need manual review`);
  }
}

// Run the agent
processIssues()
  .then(() => {
    console.log('\n✨ Issue reformulation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });