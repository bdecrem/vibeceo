#!/usr/bin/env node

/**
 * Process Edits with Claude
 * Uses Claude CLI to edit HTML based on user requests
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
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CRITICAL: Use full path for Claude CLI (cron compatibility)
// Try multiple Claude CLI locations
const CLAUDE_PATHS = [
  '/Users/bartdecrem/.local/bin/claude',
  '/opt/homebrew/bin/claude'
];

// Find the first existing Claude CLI
import fsSync from 'fs';
let CLAUDE_PATH = null;
for (const path of CLAUDE_PATHS) {
  if (fsSync.existsSync(path)) {
    CLAUDE_PATH = path;
    break;
  }
}

if (!CLAUDE_PATH) {
  console.error('❌ Claude CLI not found in any expected location');
  console.error('Checked:', CLAUDE_PATHS.join(', '));
  process.exit(1);
}

/**
 * Load pending edits from temp file or worker input
 */
async function loadPendingEdits() {
  // Check if we're in worker mode
  if (process.env.WORKER_INPUT) {
    try {
      const data = await fs.readFile(process.env.WORKER_INPUT, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('Error reading worker input:', error);
      return [];
    }
  }
  
  // Normal mode: read from temp file
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
 * Load prompt templates
 */
async function loadPrompts() {
  const editInstructions = await fs.readFile(
    path.join(__dirname, 'prompts', 'edit-instructions.md'),
    'utf-8'
  );
  
  const safetyRules = await fs.readFile(
    path.join(__dirname, 'prompts', 'safety-rules.md'),
    'utf-8'
  );
  
  return { editInstructions, safetyRules };
}

/**
 * Build the complete prompt for Claude
 */
function buildEditPrompt(request, prompts) {
  const { edit_request, wtaf_content } = request;
  const { editInstructions, safetyRules } = prompts;
  
  // Get the current HTML from the stacked content (loaded in collect-edit-requests.js)
  const currentHtml = request.content?.html_content || wtaf_content?.html_content || '';
  const detectedType = request.content?.detectedType || 'standard';
  
  // Check if this is a mobile/viewport issue
  const isMobileIssue = /mobile|iphone|viewport|oversized|too big|too large|doesn't fit/i.test(edit_request);
  
  let additionalInstructions = '';
  if (isMobileIssue) {
    additionalInstructions = `
## CRITICAL: Mobile Viewport Fix Required
The user is reporting mobile sizing issues. Common problems to fix:
1. Remove ANY width="800" height="600" attributes from <canvas> elements
2. Change CSS width from "calc(100vw - Xpx)" to "100%" 
3. In JavaScript, calculate canvas size based on container.clientWidth not window.innerWidth
4. Ensure body has: overflow-x: hidden; max-width: 100vw;
5. Make sure no element is wider than its container

Look specifically for:
- Hard-coded pixel dimensions (800px, 600px)
- Viewport units causing overflow (100vw)
- Canvas elements with fixed size attributes
- Missing max-width constraints
`;
  }
  
  const fullPrompt = `${editInstructions}

## App Type: ${detectedType}
${additionalInstructions}
## Safety Rules
${safetyRules}

## User's Edit Request
"${edit_request}"

## Current HTML to Edit
${currentHtml}

## Instructions
Edit the HTML above according to the user's request. Return ONLY the complete modified HTML with no explanations or markdown code blocks.`;
  
  // Check prompt size and warn if very large
  const promptSizeKB = Buffer.byteLength(fullPrompt, 'utf-8') / 1024;
  if (promptSizeKB > 100) {
    console.log(`  ⚠️  Large prompt: ${promptSizeKB.toFixed(1)} KB`);
  }
  
  return fullPrompt;
}

/**
 * Execute edit via Claude CLI
 */
async function executeEdit(prompt, requestId) {
  console.log(`  🤖 Calling Claude CLI...`);
  console.log(`  📍 Using Claude at: ${CLAUDE_PATH}`);
  
  // Write prompt to temp file (more reliable than piping for large content)
  const tempDir = os.tmpdir();
  const promptFile = path.join(tempDir, `edit-prompt-${requestId}.txt`);
  console.log(`  📝 Writing prompt to temp file: ${promptFile}`);
  console.log(`  📏 Prompt size: ${(prompt.length / 1024).toFixed(1)} KB`);
  await fs.writeFile(promptFile, prompt, 'utf-8');
  
  try {
    console.log(`  🚀 Spawning Claude process...`);
    // Use spawn instead of exec for better handling of large content
    const { spawn } = await import('child_process');
    const fsModule = await import('fs');
    
    // Create a promise to handle the Claude process
    const runClaude = () => {
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        // Spawn Claude process
        console.log(`  ⚙️  Starting Claude with --print flag...`);
        const claude = spawn(CLAUDE_PATH, ['--print'], {
          maxBuffer: 1024 * 1024 * 50, // 50MB
        });
        
        // Feed the prompt file content to Claude's stdin
        console.log(`  📤 Feeding prompt to Claude's stdin...`);
        const readStream = fsModule.createReadStream(promptFile);
        readStream.pipe(claude.stdin);
        
        let outputChunks = 0;
        let lastProgressTime = Date.now();
        
        // Collect output
        claude.stdout.on('data', (data) => {
          stdout += data.toString();
          outputChunks++;
          
          // Show progress every 2 seconds
          if (Date.now() - lastProgressTime > 2000) {
            console.log(`  ⏳ Claude is processing... (received ${outputChunks} chunks, ${(stdout.length / 1024).toFixed(1)} KB so far)`);
            lastProgressTime = Date.now();
          }
        });
        
        claude.stderr.on('data', (data) => {
          const error = data.toString();
          stderr += error;
          console.log(`  ⚠️  Claude stderr: ${error.substring(0, 200)}`);
        });
        
        // Handle completion
        claude.on('close', (code) => {
          console.log(`  🏁 Claude process closed with code: ${code}`);
          if (code !== 0) {
            console.log(`  ❌ Claude failed with stderr: ${stderr.substring(0, 500)}`);
            reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          } else {
            console.log(`  ✅ Claude completed successfully (${(stdout.length / 1024).toFixed(1)} KB output)`);
            resolve({ stdout, stderr });
          }
        });
        
        claude.on('error', (err) => {
          console.log(`  💥 Claude process error: ${err.message}`);
          reject(new Error(`Failed to start Claude CLI: ${err.message}`));
        });
        
        // Set timeout (increase to 5 minutes for complex edits)
        console.log(`  ⏱️  Setting 5-minute timeout for Claude...`);
        const timeout = setTimeout(() => {
          console.log(`  ⏰ Timeout reached! Killing Claude process...`);
          claude.kill('SIGTERM');
          reject(new Error('Claude CLI timed out after 5 minutes'));
        }, 300000);
        
        // Clear timeout if process completes
        claude.on('exit', () => {
          clearTimeout(timeout);
        });
      });
    };
    
    const { stdout, stderr } = await runClaude();
    
    // Clean up temp file
    await fs.unlink(promptFile).catch(() => {});
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('  ⚠️  Claude stderr:', stderr);
    }
    
    // Claude returns raw HTML when using --print (not JSON)
    let html = stdout.trim();
    
    // Debug: Log first 500 chars of Claude's output
    console.log(`  📄 Claude output (first 500 chars): ${html.substring(0, 500)}`);
    console.log(`  📊 Total output length: ${html.length} characters`);
    
    // Remove any markdown code blocks if Claude added them
    html = html.replace(/^```html?\n?/gm, '');
    html = html.replace(/\n?```$/gm, '');
    
    // Basic validation that we got HTML
    // Make validation more flexible - check for any HTML tag
    if (html.includes('<!DOCTYPE') || html.includes('<html') || (html.includes('<') && html.includes('>'))) {
      console.log(`  ✅ Valid HTML detected`);
      return {
        success: true,
        editedHtml: html,
        fullResponse: html
      };
    } else {
      console.log(`  ❌ No valid HTML detected in output`);
      // Log more details for debugging
      if (html.length < 100) {
        console.log(`  📝 Full output: ${html}`);
      }
      return {
        success: false,
        error: 'Claude did not return valid HTML'
      };
    }
    
  } catch (error) {
    console.error(`  ❌ Error executing Claude:`, error.message);
    
    // If timeout, try a simpler approach with just exec
    if (error.message.includes('timed out')) {
      console.log('  🔄 Retrying with simpler exec approach...');
      try {
        // Just use the file directly with Claude
        const { stdout, stderr } = await execAsync(
          `${CLAUDE_PATH} --print < "${promptFile}"`,
          {
            maxBuffer: 1024 * 1024 * 50, // 50MB
            timeout: 300000, // 5 minutes
            shell: '/bin/bash'
          }
        );
        
        await fs.unlink(promptFile).catch(() => {});
        
        let html = stdout.trim();
        console.log(`  📄 Retry output (first 500 chars): ${html.substring(0, 500)}`);
        html = html.replace(/^```html?\n?/gm, '');
        html = html.replace(/\n?```$/gm, '');
        
        if (html.includes('<!DOCTYPE') || html.includes('<html') || (html.includes('<') && html.includes('>'))) {
          console.log('  ✅ Retry successful');
          return {
            success: true,
            editedHtml: html,
            fullResponse: html
          };
        }
      } catch (retryError) {
        console.error(`  ❌ Retry also failed:`, retryError.message);
      }
    }
    
    // Clean up temp file on error
    await fs.unlink(promptFile).catch(() => {});
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process a single edit request
 */
async function processEditRequest(request, prompts) {
  const appSlug = request.wtaf_content?.app_slug || 'unknown';
  const detectedType = request.content?.detectedType || 'standard';
  
  console.log(`\n📝 Processing: ${appSlug}`);
  console.log(`  Request: "${request.edit_request}"`);
  console.log(`  Type: ${detectedType}`);
  
  // Build the prompt
  const prompt = buildEditPrompt(request, prompts);
  
  // Execute the edit
  const result = await executeEdit(prompt, request.id);
  
  if (result.success) {
    console.log(`  ✅ Edit completed successfully`);
    
    // Generate AI summary of changes
    const summary = generateEditSummary(request.edit_request, request.content.detectedType);
    
    // Prepare the result for next stage
    request.editResult = {
      success: true,
      editedHtml: result.editedHtml,
      aiSummary: summary,
      originalHtml: request.content.html_content
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
 * Generate a summary of what was edited
 */
function generateEditSummary(editRequest, appType) {
  // Simple summary generation (could be enhanced with AI later)
  const summaries = {
    'game': `Modified game based on request: "${editRequest}"`,
    'zad': `Updated ZAD app per request: "${editRequest}"`,
    'form': `Edited form according to: "${editRequest}"`,
    'standard': `Applied changes: "${editRequest}"`
  };
  
  return summaries[appType] || `Edited as requested: "${editRequest}"`;
}

/**
 * Save processed results for next stage
 */
async function saveProcessedEdits(requests) {
  // In worker mode, update the same file
  if (process.env.WORKER_INPUT) {
    await fs.writeFile(process.env.WORKER_INPUT, JSON.stringify(requests, null, 2));
  } else {
    // Normal mode: write to processed file
    const tempFile = path.join(__dirname, '.processed-edits.json');
    await fs.writeFile(tempFile, JSON.stringify(requests, null, 2));
  }
}

// Main execution
async function main() {
  console.log('🎨 Webtoys Edit Agent - Processing Phase');
  console.log('=' + '='.repeat(50));
  
  // Load pending edits
  const requests = await loadPendingEdits();
  
  if (requests.length === 0) {
    console.log('No pending edits to process');
    process.exit(1);
  }
  
  console.log(`📝 Processing ${requests.length} edit request(s)`);
  
  // Load prompts
  const prompts = await loadPrompts();
  
  // Process each request
  const processedRequests = [];
  let successCount = 0;
  
  for (const request of requests) {
    const processed = await processEditRequest(request, prompts);
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