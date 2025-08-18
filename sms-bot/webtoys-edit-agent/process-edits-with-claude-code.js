#!/usr/bin/env node

/**
 * Alternative Edit Processor using Claude Code instead of Claude CLI
 * This gives us the full power of Claude Code with tools and context
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Claude Code instead of Claude CLI
const CLAUDE_CODE_PATH = '/opt/homebrew/bin/claude';

/**
 * Load pending edits from temp file
 */
async function loadPendingEdits() {
  try {
    const tempFile = path.join(__dirname, '.pending-edits.json');
    const data = await fs.readFile(tempFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No pending edits file found');
    return [];
  }
}

/**
 * Execute edit via Claude Code (not just CLI)
 */
async function executeEditWithClaudeCode(request) {
  const { edit_request, wtaf_content } = request;
  const currentHtml = request.content?.html_content || wtaf_content?.html_content || '';
  const appSlug = wtaf_content?.app_slug || 'unknown';
  
  console.log(`  🤖 Using Claude Code for intelligent editing...`);
  
  // Save HTML to temp file
  const tempDir = os.tmpdir();
  const htmlFile = path.join(tempDir, `${appSlug}.html`);
  await fs.writeFile(htmlFile, currentHtml, 'utf-8');
  
  // Build a Claude Code prompt that leverages its full capabilities
  const prompt = `
I need you to edit an HTML file for a Webtoys app. The user has requested: "${edit_request}"

The HTML file is at: ${htmlFile}

IMPORTANT CONTEXT:
- This is a Webtoys app that users created via SMS
- The edit request mentions mobile/iPhone viewport issues
- Previous attempts with simple text replacement have failed
- You need to make the app properly responsive on mobile

Please:
1. Read the HTML file at ${htmlFile}
2. Analyze what's causing the mobile viewport issues
3. Fix the issues comprehensively:
   - Remove any hardcoded canvas dimensions from HTML attributes
   - Update CSS to use percentage-based widths instead of viewport units
   - Ensure JavaScript canvas sizing is responsive to container size
   - Add proper overflow prevention to body
   - Test that touch coordinates will map correctly
4. Write the complete fixed HTML back to the same file
5. Return a summary of what you changed

Use your full capabilities - read the file, analyze it properly, and write back a complete fix.
Don't just do simple text replacement - understand the structure and fix it properly.
`;

  // Create a temp script that Claude Code can execute
  const scriptFile = path.join(tempDir, 'edit-task.md');
  await fs.writeFile(scriptFile, prompt, 'utf-8');
  
  try {
    // Execute Claude Code with the full prompt
    console.log(`  🚀 Executing Claude Code with full context...`);
    const { stdout, stderr } = await execAsync(
      `cat "${scriptFile}" | ${CLAUDE_CODE_PATH}`,
      {
        maxBuffer: 1024 * 1024 * 50, // 50MB
        timeout: 60000, // 1 minute
        shell: '/bin/bash'
      }
    );
    
    // Read the edited HTML back
    const editedHtml = await fs.readFile(htmlFile, 'utf-8');
    
    // Clean up temp files
    await fs.unlink(scriptFile).catch(() => {});
    await fs.unlink(htmlFile).catch(() => {});
    
    // Extract summary from Claude's response
    const summary = stdout.substring(0, 500); // First 500 chars as summary
    
    return {
      success: true,
      editedHtml: editedHtml,
      summary: summary
    };
    
  } catch (error) {
    console.error(`  ❌ Error executing Claude Code:`, error.message);
    
    // Clean up temp files on error
    await fs.unlink(scriptFile).catch(() => {});
    await fs.unlink(htmlFile).catch(() => {});
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Alternative approach: Create a proper prompt for Claude to use with tools
 */
async function buildClaudeCodePrompt(request) {
  const { edit_request } = request;
  const appSlug = request.wtaf_content?.app_slug || 'unknown';
  
  // This prompt is designed to trigger Claude Code's tool usage
  return `
You are editing a Webtoys app called "${appSlug}".

The user's request: "${edit_request}"

The HTML file to edit is provided below. Please make the requested changes while:
1. Preserving all existing functionality (especially ZAD APIs, game loops, form handlers)
2. Properly handling mobile viewport issues if mentioned
3. Using responsive design patterns
4. Testing mentally that the changes will work

For mobile/viewport issues specifically:
- Remove hardcoded dimensions from canvas elements
- Use container-relative sizing not viewport units
- Ensure proper coordinate mapping for touch events
- Prevent horizontal scroll with overflow-x: hidden

Return ONLY the complete edited HTML with no explanations.

Current HTML:
${request.content?.html_content || ''}
`;
}

/**
 * Process a single edit request with Claude Code
 */
async function processEditRequest(request) {
  const appSlug = request.wtaf_content?.app_slug || 'unknown';
  
  console.log(`\n📝 Processing: ${appSlug}`);
  console.log(`  Request: "${request.edit_request}"`);
  console.log(`  Using Claude Code for intelligent processing...`);
  
  // Try the Claude Code approach
  const result = await executeEditWithClaudeCode(request);
  
  if (result.success) {
    console.log(`  ✅ Edit completed successfully`);
    
    request.editResult = {
      success: true,
      editedHtml: result.editedHtml,
      aiSummary: result.summary || `Edited according to: "${request.edit_request}"`,
      originalHtml: request.content?.html_content
    };
  } else {
    console.log(`  ❌ Edit failed: ${result.error}`);
    request.editResult = {
      success: false,
      error: result.error
    };
  }
  
  return request;
}

/**
 * Save processed results for next stage
 */
async function saveProcessedEdits(requests) {
  const tempFile = path.join(__dirname, '.processed-edits.json');
  await fs.writeFile(tempFile, JSON.stringify(requests, null, 2));
}

// Main execution
async function main() {
  console.log('🎨 Webtoys Edit Agent - Claude Code Processing');
  console.log('=' + '='.repeat(50));
  console.log('Using full Claude Code capabilities instead of basic CLI');
  
  // Load pending edits
  const requests = await loadPendingEdits();
  
  if (requests.length === 0) {
    console.log('No pending edits to process');
    process.exit(1);
  }
  
  console.log(`📝 Processing ${requests.length} edit request(s)`);
  
  // Process each request
  const processedRequests = [];
  let successCount = 0;
  
  for (const request of requests) {
    const processed = await processEditRequest(request);
    processedRequests.push(processed);
    
    if (processed.editResult && processed.editResult.success) {
      successCount++;
    }
  }
  
  // Save results for validation stage
  await saveProcessedEdits(processedRequests);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Processed ${successCount}/${requests.length} edits successfully`);
  
  if (successCount > 0) {
    console.log('Ready for validation stage');
    process.exit(0);
  } else {
    console.log('No successful edits to validate');
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}