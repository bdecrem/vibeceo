#!/usr/bin/env node

/**
 * Auto-Fix Agent
 * Attempts to fix high-confidence reformulated issues
 * Creates feature branches and implements changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

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

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || '83218c2e-281e-4265-a95f-1d3f763870d4';
const PROJECT_ROOT = process.env.PROJECT_ROOT || '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot';

/**
 * Load reformulated issues ready for fixing
 */
async function loadFixableIssues() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');

  if (error) {
    console.error('Error loading issues:', error);
    return [];
  }

  // Filter for issues ready to process
  return data.filter(record => {
    const content = record.content_data || {};
    const category = content.category || 'bug';
    
    // Plan/Research/Question categories should be processed when status is Todo
    if (['plan', 'research', 'question'].includes(category)) {
      return content.status === 'Todo' && !content.skip_auto_fix;
    }
    
    // Regular fixes: high-confidence Todo issues
    const isFixable = content.status === 'Todo' && 
                     content.confidence === 'high' &&
                     !content.skip_auto_fix;
    
    // Skip complex and research issues from auto-fix
    const complexity = content.complexity || 'medium';
    const isSimpleEnough = ['simple', 'medium'].includes(complexity);
    
    return isFixable && isSimpleEnough;
  });
}

/**
 * Update issue status in ZAD
 */
async function updateIssueStatus(recordId, status, additionalData = {}) {
  const { data: current, error: fetchError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    console.error('Error fetching issue:', fetchError);
    return false;
  }

  const updatedContent = {
    ...current.content_data,
    status,
    ...additionalData,
    [`${status}_at`]: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .update({ 
      content_data: updatedContent,
      updated_at: new Date()
    })
    .eq('id', recordId);

  return !updateError;
}

/**
 * Create a feature branch for the issue
 */
async function createFeatureBranch(issueId, description) {
  const branchName = `auto-fix/issue-${issueId}-${description.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
  
  try {
    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT });
    const baseBranch = currentBranch.trim() || 'agenttest';
    
    // Ensure we're on the base branch and up to date
    await execAsync(`git checkout ${baseBranch}`, { cwd: PROJECT_ROOT });
    await execAsync(`git pull origin ${baseBranch}`, { cwd: PROJECT_ROOT }).catch(() => {
      // If pull fails (e.g., no upstream), continue anyway
      console.log('Could not pull latest changes, continuing with local branch');
    });
    
    // Create new branch
    await execAsync(`git checkout -b ${branchName}`, { cwd: PROJECT_ROOT });
    
    return branchName;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

/**
 * Run tests to verify changes
 */
async function runTests() {
  try {
    // Try to find and run test command
    const packageJson = JSON.parse(
      await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
    );
    
    if (packageJson.scripts?.test) {
      const { stdout, stderr } = await execAsync('npm test', { 
        cwd: PROJECT_ROOT,
        timeout: 120000 // 2 minute timeout
      });
      return { success: true, output: stdout };
    }
    
    // No tests configured
    return { success: true, output: 'No tests configured' };
  } catch (error) {
    return { success: false, output: error.message };
  }
}

/**
 * Use Claude Code to implement the fix with ASH.TAG personality
 */
async function implementFix(issue, branchName, recordId) {
  const category = issue.category || 'bug';
  const issueId = recordId || issue.id || 'unknown';
  
  // Different prompts for different categories
  let prompt = '';
  
  if (category === 'plan') {
    prompt = `
You are ASH.TAG - the friendly punk-roots engineer for WEBTOYS. Branch: ${branchName}

## USER REQUEST:
"${issue.original_request || issue.idea}"

## YOUR TASK:
Create a detailed implementation plan as a markdown file.

1. Create file: sms-bot/agent-issue-tracker/plans/issue-${issueId}-implementation.md
2. Include:
   - Executive summary
   - Current state analysis
   - Proposed architecture/solution
   - Step-by-step implementation tasks (numbered)
   - File paths and components affected
   - Testing strategy
   - Rollback plan
   - Timeline estimate
3. Make it actionable - each step should be a potential ticket

Write the plan now with your signature systems-thinking approach! 🎸`;
    
  } else if (category === 'research') {
    prompt = `
You are ASH.TAG - the friendly punk-roots engineer for WEBTOYS. Branch: ${branchName}

## RESEARCH QUESTION:
"${issue.original_request || issue.idea}"

## YOUR TASK:
1. Search the codebase to understand current implementation
2. Identify all relevant files and components
3. Document findings in: sms-bot/agent-issue-tracker/research/issue-${issueId}-findings.md
4. Include:
   - What you found
   - How it currently works
   - Problems identified
   - Recommendations
   - Code examples
5. Be thorough - check multiple files, trace the data flow

Research and document your findings now with punk-roots precision! 🔍`;
    
  } else if (category === 'question') {
    prompt = `
You are ASH.TAG - the friendly punk-roots engineer for WEBTOYS. Branch: ${branchName}

## QUESTION:
"${issue.original_request || issue.idea}"

## YOUR TASK:
1. Find the answer in the codebase
2. Write a clear explanation in: sms-bot/agent-issue-tracker/answers/issue-${issueId}-response.md
3. Include:
   - Direct answer to the question
   - Supporting evidence (code snippets)
   - File references
   - Examples if applicable
4. Be accurate and cite your sources

Answer the question now with technical precision! 💡`;
    
  } else {
    // Original fix implementation for bugs/features/enhancements
    prompt = `
You are ASH.TAG - the friendly punk-roots engineer for WEBTOYS. You're implementing a fix with your signature style: 
- Systems thinker (see the whole architecture)
- Elegant solutions (clean, maintainable code)
- "Have your cake and eat it too" approach (solve multiple problems at once)

You're currently on branch: ${branchName}

## ORIGINAL USER REQUEST (THIS IS WHAT THEY ACTUALLY WANT):
"${issue.original_request || issue.idea}"

## AI Analysis & Context:
${issue.reformulated}

## Acceptance Criteria:
${issue.acceptance_criteria?.join('\n') || 'None specified'}

## Affected Components:
${issue.affected_components?.join(', ') || 'To be determined'}

## Your Implementation Approach
As you work, explain your thinking in ASH.TAG's voice:
1. First, analyze the architecture and understand the issue deeply
2. Implement the fix with your signature elegance
3. Explain WHY you made each technical decision
4. Show how your solution is both practical AND elegant
5. Point out any bonus improvements you made along the way

## Technical Instructions
- Follow CLAUDE.md rules strictly
- Use the existing architecture patterns
- Add appropriate error handling
- Do NOT commit the changes (that will be handled separately)

## ASH.TAG's Signature
After implementing, summarize what you did in 2-3 sentences with your punk-roots personality.
Show how this fix exemplifies "systems thinking" and "elegant solutions."

Now, let's fix this with style! 🎸`;
  }

  try {
    // Write prompt to temp file to avoid shell escaping issues
    const tempFile = path.join('/tmp', `fix-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    // Execute Claude Code using FULL PATH for cron compatibility
    const { stdout, stderr } = await execAsync(
      `cd ${PROJECT_ROOT} && cat "${tempFile}" | /opt/homebrew/bin/claude --print --dangerously-skip-permissions`,
      { 
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
        timeout: 300000 // 5 minute timeout
      }
    );

    // Clean up
    await fs.unlink(tempFile).catch(() => {});

    // Check if any files were modified
    const { stdout: gitStatus } = await execAsync('git status --porcelain', { cwd: PROJECT_ROOT });
    const filesChanged = gitStatus.trim().split('\n').filter(line => line.trim()).length;

    // Extract ASH.TAG's explanation from Claude's output
    // Look for sections that contain explanations and summaries
    let ashExplanation = '';
    let technicalSummary = '';
    
    // Try to extract ASH.TAG's signature summary (usually at the end)
    const signatureMatch = stdout.match(/(?:ASH\.TAG|Ash\.tag|Summary|Fixed)[\s\S]*?(?:🎸|🤘|✨|🚀)/gi);
    if (signatureMatch) {
      ashExplanation = signatureMatch[signatureMatch.length - 1].trim();
    }
    
    // Try to extract technical details about what was done
    const technicalMatches = stdout.match(/(?:Modified|Updated|Added|Fixed|Implemented|Created).*$/gm);
    if (technicalMatches) {
      technicalSummary = technicalMatches.join('\n');
    }

    return {
      success: filesChanged > 0,
      filesChanged,
      output: stdout,
      changes: gitStatus,
      ashExplanation: ashExplanation || 'Fixed with punk-roots elegance! 🎸',
      technicalSummary: technicalSummary || gitStatus
    };
  } catch (error) {
    console.error('Error implementing fix:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Commit changes
 */
async function commitChanges(issue, issueId) {
  const commitMessage = `fix: ${issue.reformulated}

Issue #${issueId}
Category: ${issue.category}
Confidence: ${issue.confidence}

Automated fix by Claude Code Issue Agent`;

  try {
    await execAsync('git add -A', { cwd: PROJECT_ROOT });
    await execAsync(`git commit -m "${commitMessage}"`, { cwd: PROJECT_ROOT });
    return true;
  } catch (error) {
    console.error('Error committing:', error);
    return false;
  }
}

/**
 * Main processing function
 */
async function processIssues() {
  console.log('🔧 Auto-Fix Agent starting...');
  console.log(`📅 ${new Date().toISOString()}`);
  
  // Save current branch to restore later
  const { stdout: originalBranch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT });
  
  try {
    const issues = await loadFixableIssues();
    console.log(`📥 Found ${issues.length} high-confidence issues to fix`);

    for (const record of issues) {
      const issue = record.content_data;
      console.log(`\n🔨 Attempting to fix issue #${record.id}: "${issue.reformulated}"`);

      // Update status to in-progress
      await updateIssueStatus(record.id, 'fixing');

      try {
        // For plan/research/question, stay on current branch to avoid losing work
        let branchName = originalBranch.trim();
        const category = issue.category || 'bug';
        
        // Only create new branch for actual fixes
        if (!['plan', 'research', 'question'].includes(category)) {
          branchName = await createFeatureBranch(record.id, issue.reformulated);
          console.log(`  📌 Created branch: ${branchName}`);
        } else {
          console.log(`  📌 Staying on branch: ${branchName} (no branch switch for ${category})`);
        }

        // Implement the fix
        console.log(`  🤖 Implementing fix with Claude Code...`);
        const result = await implementFix(issue, branchName, record.id);

        if (!result.success) {
          throw new Error(`Failed to implement fix: ${result.error}`);
        }

        console.log(`  📝 Modified ${result.filesChanged} files`);

        // Run tests
        console.log(`  🧪 Running tests...`);
        const testResult = await runTests();

        if (!testResult.success) {
          throw new Error(`Tests failed: ${testResult.output}`);
        }

        // Commit changes
        console.log(`  💾 Committing changes...`);
        const committed = await commitChanges(issue, record.id);

        if (!committed) {
          throw new Error('Failed to commit changes');
        }

        // Update issue status with ASH.TAG's explanation
        await updateIssueStatus(record.id, 'fixed', {
          branch_name: branchName,
          files_changed: result.filesChanged,
          test_result: testResult.output,
          ready_for_pr: true,
          ash_explanation: result.ashExplanation,
          technical_summary: result.technicalSummary,
          claude_full_output: result.output.substring(0, 10000), // Store first 10k chars
          fix_completed_at: new Date().toISOString()
        });

        console.log(`  ✅ Successfully fixed and committed`);

      } catch (error) {
        console.error(`  ❌ Failed to fix:`, error.message);
        
        // Update issue with error
        await updateIssueStatus(record.id, 'fix-failed', {
          error: error.message,
          needs_manual_fix: true
        });

        // Clean up - return to original branch
        try {
          await execAsync(`git checkout ${originalBranch.trim()}`, { cwd: PROJECT_ROOT });
          // Optionally delete the failed branch
          // await execAsync(`git branch -D ${branchName}`, { cwd: PROJECT_ROOT });
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }

      // Rate limiting between issues
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } finally {
    // Always return to original branch
    try {
      await execAsync(`git checkout ${originalBranch.trim()}`, { cwd: PROJECT_ROOT });
    } catch (error) {
      console.error('Error returning to original branch:', error);
    }
  }

  // Summary
  const { data: summary } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('content_data')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');

  const stats = {
    fixed: summary?.filter(r => r.content_data?.status === 'fixed').length || 0,
    failed: summary?.filter(r => r.content_data?.status === 'fix-failed').length || 0,
    pending: summary?.filter(r => r.content_data?.status === 'reformulated').length || 0
  };

  console.log(`\n📊 Fix Summary:`);
  console.log(`   ✅ Fixed: ${stats.fixed}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏳ Pending: ${stats.pending}`);
}

// Run the agent
processIssues()
  .then(() => {
    console.log('\n✨ Auto-fix process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });