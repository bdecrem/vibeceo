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

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'webtoys-issue-tracker';
const PROJECT_ROOT = process.env.PROJECT_ROOT || '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot';

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

  // Filter for high-confidence reformulated issues
  return data.filter(record => {
    const content = record.content_data || {};
    return content.status === 'reformulated' && 
           content.confidence === 'high' &&
           !content.skip_auto_fix;
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
async function createFeatureBranch(issueId, description, issueNumber) {
  // Use the user-facing issue number in branch name if available
  const displayNumber = issueNumber || issueId;
  const branchName = `auto-fix/issue-${displayNumber}-${description.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;
  
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
 * Use Claude Code to implement the fix
 */
async function implementFix(issue, branchName) {
  const prompt = `
You are fixing an issue in the WEBTOYS codebase. You are currently on branch: ${branchName}

Issue to fix:
${issue.reformulated}

Acceptance Criteria:
${issue.acceptance_criteria?.join('\n') || 'None specified'}

Affected Components:
${issue.affected_components?.join(', ') || 'To be determined'}

Instructions:
1. Analyze the codebase to understand the issue
2. Implement the necessary changes
3. Ensure changes follow existing code patterns
4. Add appropriate error handling
5. Do NOT commit the changes (that will be handled separately)

Important: Follow the CLAUDE.md rules strictly. Use the architecture as defined.

Please implement the fix now.`;

  try {
    // Write prompt to temp file to avoid shell escaping issues
    const tempFile = path.join('/tmp', `fix-${Date.now()}.txt`);
    await fs.writeFile(tempFile, prompt);

    // Execute Claude Code using file input with bypassed permissions for automation
    const { stdout, stderr } = await execAsync(
      `cd ${PROJECT_ROOT} && cat "${tempFile}" | claude --print --dangerously-skip-permissions`,
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
async function commitChanges(issue, issueId, issueNumber) {
  const displayNumber = issueNumber || issueId;
  const commitMessage = `fix: ${issue.reformulated}

Issue #${displayNumber}
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
      const issueNumber = issue.issue_number || record.id; // Use stored issue number or fallback to ID
      console.log(`\n🔨 Attempting to fix issue #${issueNumber}: "${issue.reformulated}"`);

      // Update status to in-progress
      await updateIssueStatus(record.id, 'fixing');

      try {
        // Create feature branch
        const branchName = await createFeatureBranch(record.id, issue.reformulated, issueNumber);
        console.log(`  📌 Created branch: ${branchName}`);

        // Implement the fix
        console.log(`  🤖 Implementing fix with Claude Code...`);
        const result = await implementFix(issue, branchName);

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
        const committed = await commitChanges(issue, record.id, issueNumber);

        if (!committed) {
          throw new Error('Failed to commit changes');
        }

        // Update issue status
        await updateIssueStatus(record.id, 'fixed', {
          branch_name: branchName,
          files_changed: result.filesChanged,
          test_result: testResult.output,
          ready_for_pr: true
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