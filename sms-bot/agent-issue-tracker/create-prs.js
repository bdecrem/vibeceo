#!/usr/bin/env node

/**
 * PR Creation Agent
 * Creates GitHub pull requests for successfully fixed issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
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
 * Load fixed issues ready for PR creation
 */
async function loadFixedIssues() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', ISSUE_TRACKER_APP_ID)
    .eq('action_type', 'issue');

  if (error) {
    console.error('Error loading issues:', error);
    return [];
  }

  // Filter for fixed issues ready for PR
  return data.filter(record => {
    const content = record.content_data || {};
    return content.status === 'fixed' && 
           content.ready_for_pr === true &&
           !content.pr_url;
  });
}

/**
 * Update an issue's status and data
 */
async function updateIssue(recordId, updates) {
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
    ...updates,
    updated_at: new Date().toISOString()
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
 * Update issue with PR information
 */
async function updateIssueWithPR(recordId, prUrl, prNumber) {
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
    status: 'pr-created',
    pr_url: prUrl,
    pr_number: prNumber,
    pr_created_at: new Date().toISOString()
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
 * Generate PR description from issue data
 */
function generatePRDescription(issue, issueId, issueNumber) {
  const displayNumber = issueNumber || issueId;
  const sections = [];

  sections.push('## Summary');
  sections.push(issue.reformulated);
  sections.push('');

  if (issue.acceptance_criteria?.length > 0) {
    sections.push('## Acceptance Criteria');
    issue.acceptance_criteria.forEach(criterion => {
      sections.push(`- [x] ${criterion}`);
    });
    sections.push('');
  }

  if (issue.affected_components?.length > 0) {
    sections.push('## Affected Components');
    issue.affected_components.forEach(component => {
      sections.push(`- ${component}`);
    });
    sections.push('');
  }

  sections.push('## Issue Details');
  sections.push(`- **Issue**: #${displayNumber}`);
  sections.push(`- **Category**: ${issue.category}`);
  sections.push(`- **Author**: ${issue.author}`);
  sections.push(`- **Confidence**: ${issue.confidence}`);
  sections.push(`- **Original Request**: "${issue.idea}"`);
  sections.push('');

  if (issue.files_changed) {
    sections.push('## Changes');
    sections.push(`Modified ${issue.files_changed} files`);
    sections.push('');
  }

  if (issue.test_result) {
    sections.push('## Test Results');
    sections.push('```');
    sections.push(issue.test_result.substring(0, 500));
    if (issue.test_result.length > 500) {
      sections.push('...(truncated)');
    }
    sections.push('```');
    sections.push('');
  }

  sections.push('---');
  sections.push('*This PR was automatically generated by the Claude Code Issue Agent*');
  sections.push(`*Issue submitted by: ${issue.author}*`);

  return sections.join('\n');
}

/**
 * Create a GitHub PR using gh CLI
 */
async function createPullRequest(issue, issueId, branchName, issueNumber) {
  const title = `fix: ${issue.reformulated.substring(0, 80)}`;
  const body = generatePRDescription(issue, issueId, issueNumber);

  try {
    // First, push the branch to remote using gh's git credential helper
    console.log(`  📤 Pushing branch ${branchName} to remote...`);
    await execAsync(`git checkout ${branchName}`, { cwd: PROJECT_ROOT });
    
    // Set git to use gh's credentials for this push
    await execAsync(`git config credential.helper "!gh auth git-credential"`, { cwd: PROJECT_ROOT });
    await execAsync(`git push -u origin ${branchName}`, { cwd: PROJECT_ROOT });

    // Create PR using gh CLI with body from file to avoid escaping issues
    console.log(`  📝 Creating pull request...`);
    const tempFile = path.join('/tmp', `pr-body-${Date.now()}.md`);
    await fs.writeFile(tempFile, body);
    
    const { stdout } = await execAsync(
      `/opt/homebrew/bin/gh pr create --title "${title}" --body-file "${tempFile}" --base agenttest --head ${branchName}`,
      { cwd: PROJECT_ROOT }
    );
    
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

    // Extract PR URL from output
    const prUrlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
    const prUrl = prUrlMatch ? prUrlMatch[0] : null;

    // Extract PR number
    const prNumberMatch = prUrl?.match(/\/pull\/(\d+)/);
    const prNumber = prNumberMatch ? parseInt(prNumberMatch[1]) : null;

    return { prUrl, prNumber };
  } catch (error) {
    console.error('Error creating PR:', error);
    throw error;
  }
}

/**
 * Add labels to the PR
 */
async function addPRLabels(prNumber, issue) {
  const labels = [];

  // Add category as label
  if (issue.category) {
    labels.push(issue.category);
  }

  // Add confidence as label
  if (issue.confidence) {
    labels.push(`confidence:${issue.confidence}`);
  }

  // Add auto-generated label
  labels.push('auto-generated');

  try {
    await execAsync(
      `/opt/homebrew/bin/gh pr edit ${prNumber} --add-label "${labels.join(',')}"`,
      { cwd: PROJECT_ROOT }
    );
    return true;
  } catch (error) {
    console.log('Warning: Could not add labels (labels may not exist in repo)');
    return false;
  }
}

/**
 * Main processing function
 */
async function processPullRequests() {
  console.log('🚀 PR Creation Agent starting...');
  console.log(`📅 ${new Date().toISOString()}`);

  // Save current branch
  const { stdout: originalBranch } = await execAsync('git branch --show-current', { cwd: PROJECT_ROOT });

  try {
    const issues = await loadFixedIssues();
    console.log(`📥 Found ${issues.length} fixed issues ready for PR creation`);

    let created = 0;
    let failed = 0;

    for (const record of issues) {
      const issue = record.content_data;
      const issueNumber = issue.issue_number || record.id; // Use stored issue number
      console.log(`\n🎯 Creating PR for issue #${issueNumber}: "${issue.reformulated}"`);

      try {
        if (!issue.branch_name) {
          throw new Error('No branch name found for fixed issue');
        }

        // Update status to 'pr-creating'
        await updateIssue(record.id, {
          status: 'pr-creating',
          pr_creation_started_at: new Date().toISOString()
        });

        // Create the PR
        const { prUrl, prNumber } = await createPullRequest(issue, record.id, issue.branch_name, issueNumber);

        if (!prUrl) {
          throw new Error('Failed to create PR - no URL returned');
        }

        console.log(`  ✅ PR created: ${prUrl}`);

        // Add labels
        if (prNumber) {
          await addPRLabels(prNumber, issue);
          console.log(`  🏷️  Labels added`);
        }

        // Update issue in database
        await updateIssueWithPR(record.id, prUrl, prNumber);
        created++;

        // Post a comment on the PR with additional context
        if (prNumber && issue.comments?.length > 0) {
          const comment = `### Community Discussion\n\n${issue.comments.map(c => `- ${c}`).join('\n')}`;
          try {
            await execAsync(
              `/opt/homebrew/bin/gh pr comment ${prNumber} --body "${comment}"`,
              { cwd: PROJECT_ROOT }
            );
          } catch (commentError) {
            console.error('Error adding comment:', commentError);
          }
        }

      } catch (error) {
        console.error(`  ❌ Failed to create PR:`, error.message);
        failed++;

        // Update issue with error
        const { data: current } = await supabase
          .from('wtaf_zero_admin_collaborative')
          .select('*')
          .eq('id', record.id)
          .single();

        if (current) {
          await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({
              content_data: {
                ...current.content_data,
                pr_creation_error: error.message,
                pr_creation_failed_at: new Date().toISOString()
              }
            })
            .eq('id', record.id);
        }
      }
    }

    console.log(`\n📊 PR Creation Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ❌ Failed: ${failed}`);

    // List all open PRs created by the agent
    console.log(`\n📋 Checking all auto-generated PRs...`);
    try {
      const { stdout: prList } = await execAsync(
        `/opt/homebrew/bin/gh pr list --label "auto-generated" --state open --json number,title,url`,
        { cwd: PROJECT_ROOT }
      );
      
      const prs = JSON.parse(prList);
      if (prs.length > 0) {
        console.log(`\n🔍 Open auto-generated PRs:`);
        prs.forEach(pr => {
          console.log(`   #${pr.number}: ${pr.title}`);
          console.log(`   ${pr.url}`);
        });
      }
    } catch (error) {
      console.error('Error listing PRs:', error);
    }

  } finally {
    // Return to original branch
    try {
      await execAsync(`git checkout ${originalBranch.trim()}`, { cwd: PROJECT_ROOT });
    } catch (error) {
      console.error('Error returning to original branch:', error);
    }
  }
}

// Run the agent
processPullRequests()
  .then(() => {
    console.log('\n✨ PR creation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });