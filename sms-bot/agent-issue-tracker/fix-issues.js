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
    const isFixable = (content.status === 'Todo' || content.status === 'reformulated') && 
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
 * Use Claude Code to implement the fix or action
 */
async function implementFix(issue, branchName, recordId) {
  const category = issue.category || 'bug';
  const issueId = recordId || issue.id || 'unknown';
  
  // Different prompts for different categories
  let prompt = '';
  
  if (category === 'plan') {
    prompt = `
You are creating an implementation plan for the WEBTOYS codebase. Branch: ${branchName}

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

Write the plan now.`;
    
  } else if (category === 'research') {
    prompt = `
You are researching a topic for the WEBTOYS codebase. Branch: ${branchName}

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

Research and document your findings now.`;
    
  } else if (category === 'question') {
    prompt = `
You are answering a technical question about the WEBTOYS codebase. Branch: ${branchName}

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

Answer the question now.`;
    
  } else {
    // Original fix implementation for bugs/features/enhancements
    prompt = `
You are fixing an issue in the WEBTOYS codebase. You are currently on branch: ${branchName}

## ORIGINAL USER REQUEST (THIS IS WHAT THEY ACTUALLY WANT):
"${issue.original_request || issue.idea}"

## AI Analysis & Context:
${issue.reformulated}

${issue.implementation_notes ? `## Implementation Notes:
${issue.implementation_notes}` : ''}

## Acceptance Criteria:
${issue.acceptance_criteria?.join('\n') || 'None specified'}

## Affected Components:
${issue.affected_components?.join(', ') || 'To be determined'}

## Issue Complexity: ${issue.complexity || 'medium'}
${issue.complexity === 'complex' ? 'This is a complex issue. Take time to understand the architecture before making changes.' : ''}
${issue.complexity === 'research' ? 'This requires investigation. Start by exploring the codebase to understand the current implementation.' : ''}

## Instructions:
1. READ THE ORIGINAL USER REQUEST CAREFULLY - that's what needs to be solved
2. Use the AI analysis as helpful context, but prioritize the user's actual request
3. ${issue.complexity === 'complex' || issue.complexity === 'research' ? 'Create a plan first, then implement step by step' : 'Implement the necessary changes'}
4. Ensure changes follow existing code patterns and CLAUDE.md rules
5. Add appropriate error handling
6. Do NOT commit the changes (that will be handled separately)

Important: The user's ORIGINAL REQUEST is the source of truth. The reformulation is just to help clarify, not replace their intent.

Please implement the fix now.`;
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

    return {
      success: filesChanged > 0,
      filesChanged,
      output: stdout,
      changes: gitStatus
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
    // First, let's check for complex issues that are being skipped
    const { data: allReformulated } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', ISSUE_TRACKER_APP_ID)
      .eq('action_type', 'issue');
    
    const complexIssues = allReformulated?.filter(record => {
      const content = record.content_data || {};
      const category = content.category || 'bug';
      // Don't warn about complex plan/research/question - they're supposed to be processed
      return (content.status === 'Todo' || content.status === 'reformulated') && 
             content.confidence === 'high' &&
             ['complex', 'research'].includes(content.complexity) &&
             !['plan', 'research', 'question'].includes(category);
    }) || [];
    
    if (complexIssues.length > 0) {
      console.log(`⚠️  Skipping ${complexIssues.length} complex/research issues that need manual review:`);
      complexIssues.forEach(record => {
        console.log(`   - #${record.id}: ${record.content_data.reformulated} (${record.content_data.complexity})`);
      });
    }
    
    const issues = await loadFixableIssues();
    console.log(`📥 Found ${issues.length} simple/medium high-confidence issues to auto-fix`);

    for (const record of issues) {
      const issue = record.content_data;
      const category = issue.category || 'bug';
      const actionType = ['plan', 'research', 'question'].includes(category) ? category : 'fix';
      
      console.log(`\n🔨 Processing ${actionType} request #${record.id}: "${issue.original_request || issue.reformulated}"`);

      // Update status to In Progress
      await updateIssueStatus(record.id, 'In Progress');

      try {
        // For plan/research/question, stay on current branch to avoid losing work
        let branchName = originalBranch.trim();
        
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
        
        // For plan/research/question, capture the content and create GitHub link
        let planContent = null;
        let githubLink = null;
        
        if (['plan', 'research', 'question'].includes(category)) {
          // Read the created file to get content
          const fileName = category === 'plan' ? `plans/issue-${record.id}-implementation.md` :
                          category === 'research' ? `research/issue-${record.id}-findings.md` :
                          `answers/issue-${record.id}-response.md`;
          
          try {
            planContent = await fs.readFile(path.join(__dirname, fileName), 'utf-8');
            
            // Get the last commit hash
            const { stdout: commitHash } = await execAsync('git rev-parse HEAD', { cwd: PROJECT_ROOT });
            
            // Create GitHub link to the file
            githubLink = `https://github.com/bdecrem/vibeceo/blob/${commitHash.trim()}/sms-bot/agent-issue-tracker/${fileName}`;
            
            console.log(`  📄 Plan saved: ${githubLink}`);
          } catch (readError) {
            console.error('Could not read plan file:', readError);
          }
        }

        // Update issue status to Done with plan content
        await updateIssueStatus(record.id, 'Done', {
          branch_name: branchName,
          files_changed: result.filesChanged,
          test_result: testResult.output,
          ready_for_pr: !['plan', 'research', 'question'].includes(category),
          plan_content: planContent,
          github_link: githubLink,
          [`${category}_completed_at`]: new Date().toISOString()
        });

        console.log(`  ✅ Successfully fixed and committed`);

      } catch (error) {
        console.error(`  ❌ Failed to fix:`, error.message);
        
        // Update issue with error - back to Todo
        await updateIssueStatus(record.id, 'Todo', {
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
    fixed: summary?.filter(r => r.content_data?.status === 'Done').length || 0,
    failed: summary?.filter(r => r.content_data?.status === 'Todo' && r.content_data?.needs_manual_fix).length || 0,
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