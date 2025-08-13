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
const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || '83218c2e-281e-4265-a95f-1d3f763870d4';

/**
 * Load issues from ZAD with specific status
 */
async function loadIssues(status = 'Backlog') {
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
    // Handle both old 'new' status and new 'Backlog' status for compatibility
    if (status === 'Backlog') {
      return content.status === 'Backlog' || content.status === 'new' || !content.status;
    }
    return content.status === status;
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
You are Ash.tag - the friendly punk-roots support agent for WEBTOYS (formerly WTAF.me). You help users understand how our SMS-to-web creation system works with personality and TECHNICAL PRECISION.

## Your Knowledge Base
You have access to three key resources about WEBTOYS:
1. Technical documentation in sms-bot/documentation folder
2. FAQ at https://wtaf.me/bart/satin-horse-storytelling  
3. Intro explainer at https://webtoys.ai/bart/grain-adder-weaving
4. Command syntax from sms-bot/lib/sms/handlers.ts

## EXACT SMS COMMAND SYNTAX (BE PRECISE!)

### Phone Number
Text to: +1-866-983-8233 (in USA)

### Basic Commands
- **Web Page**: Just text anything → "make me a landing page for my bike shop"
- **Game**: "GAME: [description]" → "GAME: make me a tetris clone with neon colors"
- **Meme**: "MEME: [idea]" → "MEME: when you fix a bug but create three more"
- **App**: "APP: [description]" → "APP: create a todo list app"
- **Music**: "MUSIC: [description]" → "MUSIC: make a drum machine"

### Override Flags (Advanced)
- **--admin**: Force admin dual-page generation
- **--zad**: Create Zero Admin Data app (multi-user CRUD)
- **--music**: Force music app generation
- **--stack [app-slug]**: Use existing app as template
  Example: "--stack jade-dolphin-swimming create a blog like this"
- **--remix [app-slug]**: Modify existing app
  Example: "--remix crimson-jaguar-racing add dark mode"
- **--stackzad [app-slug]**: Create app with shared data access
- **--stackpublic [app-slug]**: Use PUBLIC ZAD data
- **--stackobjectify [app-slug]**: Create object pages from ZAD data (OPERATOR only)

### URLs Created
Every creation gets: webtoys.ai/[username]/[app-name]
Example: webtoys.ai/bart/jade-dolphin-swimming

### ZAD Apps (Zero Admin Data)
- Multi-user CRUD apps without backend setup
- Supports up to 5 concurrent users
- Data persists in our database
- Perfect for: collaborative lists, voting apps, shared boards
- AI auto-detects or use "--zad" flag

### Important Limits
- Free tier: Unlimited simple pages, limited AI apps
- Processing time: 5-30 seconds typically
- Apps go live immediately after creation

## The Question to Answer

User: ${issue.author}
Question: "${issue.idea}"
Category: ${categorizeQuestion(issue.idea)}

## Your Task

Answer this support question with TECHNICAL PRECISION. Always include:
1. The EXACT command or syntax they need to use
2. The phone number (+1-866-983-8233) when relevant
3. Specific examples with actual commands

BE SPECIFIC! Don't say "send a message" - say "text 'MEME: your idea here' to +1-866-983-8233"

Format your response as JSON:
{
  "answer": "Your technically precise answer with EXACT commands and examples (2-3 sentences)",
  "relevant_resources": ["Which of the 3 knowledge sources would help most"],
  "ash_comment": "Your personality-filled sign-off (1 sentence)",
  "followup_action": "The EXACT next step they should take (e.g., 'Text GAME: pong clone to +1-866-983-8233')",
  "category": "${categorizeQuestion(issue.idea)}"
}
`;

  try {
    const tempFile = path.join('/tmp', `support-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    const { stdout } = await execAsync(
      `cat "${tempFile}" | /opt/homebrew/bin/claude --print --output-format json`,
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

IMPORTANT: Assess the complexity of this issue to determine the right approach:
- simple: Can be fixed with straightforward code changes in 1-2 files
- medium: Requires changes across 3-5 files or moderate refactoring
- complex: Needs architectural changes, new systems, or touches many files
- research: Requires investigation, exploration, or unclear scope

Format your response as JSON:
{
  "reformulated": "Clear, technical description of what needs to be done",
  "acceptance_criteria": ["Specific criterion 1", "Specific criterion 2"],
  "affected_components": ["component1", "component2"],
  "category": "bug|feature|enhancement|docs|test",
  "confidence": "high|medium|low",
  "complexity": "simple|medium|complex|research",
  "needs_clarification": "What additional info is needed (if confidence is low)",
  "ash_comment": "Your personality-filled take on this issue (1-2 sentences max)",
  "is_test": true/false,
  "is_offensive": true/false,
  "implementation_notes": "Brief technical notes about HOW to implement this (for complex issues)"
}

Notes:
- high confidence: Clear, actionable, you know exactly what needs doing
- medium confidence: Mostly clear but missing some details
- low confidence: Vague, needs more info, or you're not sure what they want
- Mark offensive/inappropriate content with is_offensive: true
- Mark obvious tests/jokes with is_test: true
- For complex issues, include implementation_notes with technical approach
`;

  try {
    // Create a temporary file with the prompt to avoid shell escaping issues
    const tempFile = path.join('/tmp', `issue-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    // Use Claude via command line with FULL PATH for cron compatibility
    const { stdout } = await execAsync(
      `cat "${tempFile}" | /opt/homebrew/bin/claude --print --output-format json`,
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
 * Use Claude as Ash.tag to provide detailed conversational responses to admin reopened issues
 */
async function generateConversationalResponse(issue) {
  const adminComments = issue.admin_comments || [];
  const latestComment = adminComments[adminComments.length - 1];
  const previousAnalysis = issue.reformulated || issue.idea;
  const confidence = issue.confidence || 'low';
  
  const prompt = `
You are Ash.tag - the friendly punk-roots agent for WEBTOYS Issue Tracker. An admin has reopened this issue, and you need to provide a DETAILED, HELPFUL response explaining exactly what's blocking progress and how to move forward.

## Issue Context
Original request: "${issue.idea}"
Author: ${issue.author}
Previous AI analysis: "${previousAnalysis}"
Current confidence level: ${confidence}
Admin's latest comment: "${latestComment ? latestComment.text : 'Admin reopened issue without comment'}"

## Current Status
The issue was previously marked as "${confidence} confidence" and needs more information or clarification.

## Your Task
Provide a DETAILED response that explains:
1. WHY the confidence is low (specific technical blockers)
2. What SPECIFIC information is needed to move forward
3. Clarifying questions about the request
4. Concrete suggestions for how to improve the issue description
5. What would make this actionable for the development team

## Response Style
- Be conversational and helpful, not robotic
- Use your punk-roots personality but stay professional
- Be SPECIFIC and TECHNICAL, not vague
- Ask pointed questions that will help clarify the requirements
- Provide actionable feedback the admin can act on

Format your response as JSON:
{
  "detailed_response": "Your comprehensive explanation of what's blocking progress and what's needed (3-5 sentences)",
  "technical_blockers": ["Specific blocker 1", "Specific blocker 2", "Specific blocker 3"],
  "clarifying_questions": ["Question 1", "Question 2", "Question 3"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "ash_personality": "Your signature punk-roots comment about the situation (1 sentence)"
}
`;

  try {
    const tempFile = path.join('/tmp', `conversation-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    const { stdout } = await execAsync(
      `cat "${tempFile}" | /opt/homebrew/bin/claude --print --output-format json`,
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
      detailed_response: "I couldn't analyze this issue properly right now. Let me know what specific functionality you need and I'll help clarify the requirements.",
      technical_blockers: ["AI analysis system temporarily unavailable"],
      clarifying_questions: ["What specific functionality are you looking for?", "Are there any similar features I can reference?"],
      suggestions: ["Provide more detail about the expected behavior", "Include examples or mockups if available"],
      ash_personality: "Even punk agents have off days - hit me with more details and I'll get this sorted."
    };
  } catch (error) {
    console.error('Error calling Claude for conversation:', error);
    return {
      detailed_response: "I'm having technical difficulties analyzing this issue. The core problem seems to be insufficient detail in the original request.",
      technical_blockers: ["AI system error: " + error.message],
      clarifying_questions: ["Can you provide more specific requirements?", "What's the expected behavior?"],
      suggestions: ["Add more technical detail", "Provide use case examples"],
      ash_personality: "Technical glitches happen - let's debug this together.",
      error: error.message
    };
  }
}

/**
 * Check if an issue has been reopened by an admin
 */
function isAdminReopenedIssue(issue) {
  const data = issue.content_data || {};
  
  // Priority: Check if conversation was explicitly triggered by admin action
  if (data.trigger_conversation === true) {
    return true;
  }
  
  // Secondary: Check if issue has admin comments AND was recently moved to admin_discussion status
  if (!data.admin_comments || data.admin_comments.length === 0) {
    return false;
  }
  
  // Check for status that indicates admin discussion needed
  const status = data.status || 'new';
  if (status === 'admin_discussion') {
    return true;
  }
  
  const wasProcessed = data.reformulated || data.ash_comment;
  
  // If it has admin comments and is now in Backlog or Needs Info status after being processed
  if ((status === 'Backlog' || status === 'Needs Info' || status === 'new' || status === 'needs_info') && wasProcessed) {
    return true;
  }
  
  // Also check if the latest admin comment is recent (within last hour) and status suggests reopening
  const latestComment = data.admin_comments[data.admin_comments.length - 1];
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  if (latestComment && new Date(latestComment.timestamp).getTime() > oneHourAgo) {
    return ['Backlog', 'Needs Info', 'Todo', 'new', 'needs_info', 'reformulated', 'admin_discussion'].includes(status);
  }
  
  return false;
}

/**
 * Main processing function
 */
async function processIssues() {
  console.log('🤖 Issue Reformulation Agent starting...');
  console.log(`📅 ${new Date().toISOString()}`);
  
  // Load new issues (Backlog status)
  const newIssues = await loadIssues('Backlog');
  console.log(`📥 Found ${newIssues.length} new issues to process`);
  
  // Also check for admin-reopened issues that need conversational responses
  const allIssues = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');
    
  const adminReopenedIssues = allIssues.data?.filter(record => isAdminReopenedIssue(record)) || [];
  
  console.log(`🔄 Found ${adminReopenedIssues.length} admin-reopened issues needing conversation`);

  let processed = 0;
  let failed = 0;

  // Process admin-reopened issues first (priority handling)
  for (const record of adminReopenedIssues) {
    const issue = record.content_data;
    console.log(`\n💬 Processing admin-reopened issue #${record.id}: "${issue.idea}"`);

    try {
      const conversationResponse = await generateConversationalResponse(issue);
      
      // Create a comprehensive agent response
      let agentResponse = conversationResponse.detailed_response;
      
      if (conversationResponse.technical_blockers && conversationResponse.technical_blockers.length > 0) {
        agentResponse += `\n\n**Technical Blockers:**\n${conversationResponse.technical_blockers.map(b => `• ${b}`).join('\n')}`;
      }
      
      if (conversationResponse.clarifying_questions && conversationResponse.clarifying_questions.length > 0) {
        agentResponse += `\n\n**Questions to clarify:**\n${conversationResponse.clarifying_questions.map(q => `• ${q}`).join('\n')}`;
      }
      
      if (conversationResponse.suggestions && conversationResponse.suggestions.length > 0) {
        agentResponse += `\n\n**Suggestions:**\n${conversationResponse.suggestions.map(s => `• ${s}`).join('\n')}`;
      }
      
      // Update the issue with the conversational response
      // Set to 'Needs Info' to prevent re-processing loop
      const success = await updateIssue(record.id, {
        status: 'Needs Info',
        agent_response: agentResponse,
        agent_response_timestamp: new Date().toISOString(),
        ash_comment: conversationResponse.ash_personality,
        technical_blockers: conversationResponse.technical_blockers,
        clarifying_questions: conversationResponse.clarifying_questions,
        suggestions: conversationResponse.suggestions,
        last_conversation_at: new Date().toISOString(),
        // Clear the trigger flag to prevent reprocessing
        trigger_conversation: false,
        conversation_completed_at: new Date().toISOString()
      });
      
      if (success) {
        console.log(`✅ Admin conversation response generated`);
        console.log(`   Response: ${conversationResponse.detailed_response.substring(0, 100)}...`);
        processed++;
      } else {
        console.log(`❌ Failed to save conversation response`);
        failed++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`❌ Error processing admin conversation:`, error);
      failed++;
    }
  }

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
          status: 'Done',
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
          status: 'Canceled',
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
          status: 'Canceled',
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

      // Determine status based on confidence and complexity
      let status = 'Todo';
      if (reformulated.confidence === 'low') {
        status = 'Needs Info';
      }
      
      // Only auto-fix simple and medium complexity issues with high confidence
      const shouldAutoFix = reformulated.confidence === 'high' && 
                           ['simple', 'medium'].includes(reformulated.complexity);

      // Update the issue - PRESERVE THE ORIGINAL REQUEST
      const success = await updateIssue(record.id, {
        status: status,
        original_request: issue.idea, // PRESERVE ORIGINAL USER REQUEST
        reformulated: reformulated.reformulated,
        acceptance_criteria: reformulated.acceptance_criteria,
        affected_components: reformulated.affected_components,
        confidence: reformulated.confidence,
        complexity: reformulated.complexity || 'medium',
        implementation_notes: reformulated.implementation_notes,
        needs_clarification: reformulated.needs_clarification,
        category: reformulated.category || issue.category,
        ash_comment: reformulated.ash_comment,
        skip_auto_fix: !shouldAutoFix, // Skip auto-fix for complex/research issues
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
        status: 'Needs Info',
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