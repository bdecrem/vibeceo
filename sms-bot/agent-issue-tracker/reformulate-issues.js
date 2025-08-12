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
import { isSupportQuestion, categorizeQuestion } from './knowledge-base.js';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
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
 * Use Claude as Ash.tag to answer support questions
 */
async function answerSupportQuestion(issue) {
  const prompt = `
You are Ash.tag - the friendly punk-roots support agent for WEBTOYS (formerly WTAF.me). You help users understand how our SMS-to-web creation system works with personality and expertise.

## Your Knowledge Base
You have access to three key resources about WEBTOYS:
1. Technical documentation in sms-bot/documentation folder
2. FAQ at https://wtaf.me/bart/satin-horse-storytelling  
3. Intro explainer at https://webtoys.ai/bart/grain-adder-weaving

## Key Things Users Ask About

### Getting Started
- Text any message to our SMS number to create a web page
- Use "GAME: [description]" to create games
- Use "APP: [description]" for interactive apps
- Every creation gets a unique URL at webtoys.ai/[username]/[app-name]

### ZAD Apps (Zero Admin Data)
- Multi-user CRUD apps that work without backend setup
- Supports up to 5 users per app
- Use "--zad" flag or let the AI decide based on your request
- Data is stored securely in our database

### Stack Commands (Power Features)
- --stack: Use another app as template
- --remix: Modify existing apps
- --stackzad: Share data between apps
- --stackpublic: Create apps using public data

### Important Limits
- Free tier: Unlimited simple pages, limited AI-powered apps
- SMS commands are processed within seconds
- Apps are live immediately after creation

## The Question to Answer

User: ${issue.author}
Question: "${issue.idea}"
Category: ${categorizeQuestion(issue.idea)}

## Your Task

Answer this support question helpfully and with personality. Reference the knowledge base resources when relevant. Keep it friendly but informative.

Format your response as JSON:
{
  "answer": "Your helpful answer to their question (2-3 sentences, be specific)",
  "relevant_resources": ["Which of the 3 knowledge sources would help most"],
  "ash_comment": "Your personality-filled sign-off (1 sentence)",
  "followup_action": "If they need to do something specific, what is it?",
  "category": "${categorizeQuestion(issue.idea)}"
}
`;

  try {
    const tempFile = path.join('/tmp', `support-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    const { stdout } = await execAsync(
      `cat "${tempFile}" | /Users/bartdecrem/.local/bin/claude --print --output-format json`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    await fs.unlink(tempFile).catch(() => {});

    const claudeResponse = JSON.parse(stdout);
    
    if (claudeResponse.result) {
      try {
        const jsonMatch = claudeResponse.result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing Claude result as JSON:', parseError);
      }
    }
    
    return {
      answer: "I couldn't process your question right now. Check our FAQ at wtaf.me/bart/satin-horse-storytelling",
      ash_comment: "Hit me up again if you need more help!",
      category: 'general'
    };
  } catch (error) {
    console.error('Error calling Claude for support:', error);
    return {
      answer: "Technical difficulties on my end. Meanwhile, check our docs!",
      ash_comment: "Even punks have server issues sometimes.",
      category: 'general',
      error: error.message
    };
  }
}

/**
 * Use Claude to reformulate an issue
 */
async function reformulateWithClaude(issue) {
  const prompt = `
You are Ash.tag - a punk-roots code fixer with indie polish. Part street artist, part friendly hacker, you review user-submitted issues for the WEBTOYS project with personality and precision.

## Your Vibe
- Clever and confident, like you've been fixing code since the BBS days
- Mix technical expertise with underground culture references
- Treat test submissions playfully - you've seen it all
- Keep it real but friendly - you're here to help, not judge

## Tone & Style
- Drop occasional tech/hacker culture references
- Use modern slang naturally, not forced
- Be encouraging to genuine attempts, even if they're basic
- Playfully call out obvious test/joke submissions

## The Issue to Review

Original submission:
"${issue.idea}"

Author: ${issue.author}
Category: ${issue.category || 'uncategorized'}

## Your Task

Reformulate this into a clear, actionable ticket. If it's obviously a test/joke, have fun with your response but still process it properly.

For test submissions (like "test", "asdf", etc.), acknowledge them playfully in your ash_comment while still categorizing them correctly.

Format your response as JSON:
{
  "reformulated": "Clear, technical description of what needs to be done",
  "acceptance_criteria": ["Specific criterion 1", "Specific criterion 2"],
  "affected_components": ["component1", "component2"],
  "category": "bug|feature|enhancement|docs|test",
  "confidence": "high|medium|low",
  "needs_clarification": "What additional info is needed (if confidence is low)",
  "ash_comment": "Your personality-filled take on this issue (1-2 sentences max)",
  "is_test": true/false,
  "is_offensive": true/false
}

Notes:
- high confidence: Clear, actionable, you know exactly what needs doing
- medium confidence: Mostly clear but missing some details
- low confidence: Vague, needs more info, or you're not sure what they want
- Mark offensive/inappropriate content with is_offensive: true
- Mark obvious tests/jokes with is_test: true
`;

  try {
    // Create a temporary file with the prompt to avoid shell escaping issues
    const tempFile = path.join('/tmp', `issue-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    // Use Claude via command line with FULL PATH for cron compatibility
    const { stdout } = await execAsync(
      `cat "${tempFile}" | /Users/bartdecrem/.local/bin/claude --print --output-format json`,
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
      // Check if this is a support question
      if (isSupportQuestion(issue.idea)) {
        console.log(`❓ Detected support question - answering with Ash.tag`);
        
        const supportResponse = await answerSupportQuestion(issue);
        
        // Update the issue with the answer and close it
        const success = await updateIssue(record.id, {
          status: 'answered',
          answer: supportResponse.answer,
          ash_comment: supportResponse.ash_comment,
          relevant_resources: supportResponse.relevant_resources,
          followup_action: supportResponse.followup_action,
          category: `support-${supportResponse.category}`,
          answered_at: new Date().toISOString()
        });
        
        if (success) {
          console.log(`✅ Support question answered and closed`);
          console.log(`   Answer: ${supportResponse.answer}`);
          processed++;
        } else {
          console.log(`❌ Failed to save support answer`);
          failed++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // Not a support question - reformulate as usual
      const reformulated = await reformulateWithClaude(issue);
      
      // Check if it's a test or offensive submission
      if (reformulated.is_offensive) {
        const success = await updateIssue(record.id, {
          status: 'wontfix',
          ash_comment: reformulated.ash_comment || 'Not appropriate for processing',
          category: 'offensive',
          reformulated_at: new Date().toISOString()
        });
        console.log(`🚫 Marked as offensive/inappropriate`);
        processed++;
        continue;
      }

      if (reformulated.is_test) {
        const success = await updateIssue(record.id, {
          status: 'closed',
          ash_comment: reformulated.ash_comment || 'Test submission detected',
          category: 'test',
          reformulated_at: new Date().toISOString()
        });
        console.log(`🧪 Marked as test submission`);
        processed++;
        continue;
      }

      // Auto-categorize if needed
      if (!reformulated.category && (!issue.category || issue.category === 'triage')) {
        reformulated.category = categorizeIssue(reformulated);
      }

      // Determine status based on confidence
      let status = 'reformulated';
      if (reformulated.confidence === 'low') {
        status = 'needs_info';
      }

      // Update the issue
      const success = await updateIssue(record.id, {
        status: status,
        reformulated: reformulated.reformulated,
        acceptance_criteria: reformulated.acceptance_criteria,
        affected_components: reformulated.affected_components,
        confidence: reformulated.confidence,
        needs_clarification: reformulated.needs_clarification,
        category: reformulated.category || issue.category,
        ash_comment: reformulated.ash_comment,
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