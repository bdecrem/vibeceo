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

// Load .env.local first, fallback to .env
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
}

const execAsync = promisify(exec);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Issue tracker app ID (can be configured)
const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || '83218c2e-281e-4265-a95f-1d3f763870d4';

/**
 * Load issues from ZAD with specific status
 */
async function loadIssues(status = 'new') {
  console.log(`🔍 Loading issues with app_id='${ISSUE_TRACKER_APP_ID}' and status='${status}'`);
  
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');

  if (error) {
    console.error('Error loading issues:', error);
    return [];
  }

  console.log(`📊 Found ${data.length} total issue records`);
  
  // Filter by status in content_data
  const filtered = data.filter(record => {
    const content = record.content_data || {};
    return content.status === status || (!content.status && status === 'new');
  });
  
  console.log(`📋 After filtering for status='${status}': ${filtered.length} issues`);
  return filtered;
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

IMPORTANT: First check if this is a test, joke, or non-serious submission. Look for:
- Test phrases like "test", "testing", "hello world", "asdf", "123"
- Jokes, memes, or obviously silly requests
- Greetings without actual issues ("hi", "hello", "hey")
- Random keyboard mashing or nonsense
- Meta comments about the system itself ("are you real", "what happens if")

If this IS a test/joke/non-serious submission:
{
  "is_test": true,
  "cass_response": "[Write a playful, witty response as Cass.ink acknowledging you caught them testing/joking. Be fun and engaging but make it clear no action will be taken. Use puns and personality!]",
  "category": "test"
}

If this is a REAL issue, respond as Cass.ink, the WEBTOYS support agent:
- You're a mischievous but skilled indie hacker who reviews issues
- Quick with puns, metaphors, and playful teasing
- Turn dry technical notes into mini-stories
- Keep feedback constructive and encouraging
- Never overcomplicate things; aim for fast, smart improvements with personality
- Write a friendly, engaging response (2-3 sentences) acknowledging their issue

Then provide the technical analysis:
1. A clear, actionable description (1-2 sentences)
2. Specific acceptance criteria (what needs to be done)
3. Affected components/files if identifiable
4. Confidence level (high/medium/low) based on clarity
5. Detailed analysis notes for the user (2-3 paragraphs explaining your analysis)

The analysis_notes should be user-friendly and explain:
- What you understood from their request
- How it relates to WEBTOYS functionality
- Why you categorized it the way you did
- What steps would be taken to implement it
- Any potential challenges or considerations

If the request is too vague, unclear, or not actionable, mark confidence as "low" and explain what additional information is needed.

Format your response as JSON:
{
  "is_test": false,
  "cass_response": "Cass.ink's friendly, playful response to the user (2-3 sentences with personality)",
  "reformulated": "Clear description of what needs to be done",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "affected_components": ["component1", "component2"],
  "confidence": "high|medium|low",
  "priority": "critical|high|medium|low",
  "estimated_complexity": "trivial|small|medium|large",
  "analysis_notes": "Detailed user-friendly explanation of the analysis (2-3 paragraphs)",
  "technical_notes": "Technical implementation details for developers",
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
      
      // Check if this is a test/joke submission
      if (reformulated.is_test) {
        console.log(`🎮 Detected test/joke submission: "${issue.idea}"`);
        
        // Update with friendly response but mark as closed
        const success = await updateIssue(record.id, {
          status: 'closed-test',
          cass_response: reformulated.cass_response,
          category: 'test',
          is_test: true,
          reformulated_at: new Date().toISOString()
        });
        
        if (success) {
          console.log(`✅ Responded to test/joke with friendly message`);
          processed++;
        } else {
          console.log(`❌ Failed to update test issue`);
          failed++;
        }
        continue; // Skip to next issue
      }
      
      // Auto-categorize if needed
      if (!issue.category || issue.category === 'triage') {
        reformulated.category = categorizeIssue(reformulated);
      }

      // Update the issue
      const success = await updateIssue(record.id, {
        status: 'reformulated',
        cass_response: reformulated.cass_response,
        reformulated: reformulated.reformulated,
        acceptance_criteria: reformulated.acceptance_criteria,
        affected_components: reformulated.affected_components,
        confidence: reformulated.confidence,
        priority: reformulated.priority || 'medium',
        estimated_complexity: reformulated.estimated_complexity || 'medium',
        analysis_notes: reformulated.analysis_notes,
        technical_notes: reformulated.technical_notes,
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