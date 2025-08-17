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
  
  return `${editInstructions}

## App Type: ${detectedType}

## Safety Rules
${safetyRules}

## User's Edit Request
"${edit_request}"

## Current HTML to Edit
${currentHtml}

## Instructions
Edit the HTML above according to the user's request. Return ONLY the complete modified HTML with no explanations or markdown code blocks.`;

  // Check prompt size and warn if very large
  const promptSizeKB = Buffer.byteLength(prompt, 'utf-8') / 1024;
  if (promptSizeKB > 100) {
    console.log(`  ⚠️  Large prompt: ${promptSizeKB.toFixed(1)} KB`);
  }
  
  return prompt;
}

/**
 * Execute edit via Claude CLI
 */
async function executeEdit(prompt, requestId) {
  console.log(`  🤖 Calling Claude CLI...`);
  
  // Write prompt to temp file (more reliable than piping for large content)
  const tempDir = os.tmpdir();
  const promptFile = path.join(tempDir, `edit-prompt-${requestId}.txt`);
  await fs.writeFile(promptFile, prompt, 'utf-8');
  
  try {
    // Use spawn instead of exec for better handling of large content
    const { spawn } = await import('child_process');
    const fsModule = await import('fs');
    
    // Create a promise to handle the Claude process
    const runClaude = () => {
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        // Spawn Claude process
        const claude = spawn(CLAUDE_PATH, ['--print'], {
          maxBuffer: 1024 * 1024 * 50, // 50MB
        });
        
        // Feed the prompt file content to Claude's stdin
        const readStream = fsModule.createReadStream(promptFile);
        readStream.pipe(claude.stdin);
        
        // Collect output
        claude.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        claude.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Handle completion
        claude.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          } else {
            resolve({ stdout, stderr });
          }
        });
        
        claude.on('error', (err) => {
          reject(new Error(`Failed to start Claude CLI: ${err.message}`));
        });
        
        // Set timeout (increase to 5 minutes for complex edits)
        const timeout = setTimeout(() => {
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
    
    // Remove any markdown code blocks if Claude added them
    html = html.replace(/^```html?\n?/gm, '');
    html = html.replace(/\n?```$/gm, '');
    
    // Basic validation that we got HTML
    if (html.includes('<!DOCTYPE') || html.includes('<html')) {
      return {
        success: true,
        editedHtml: html,
        fullResponse: html
      };
    } else {
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
        html = html.replace(/^```html?\n?/gm, '');
        html = html.replace(/\n?```$/gm, '');
        
        if (html.includes('<!DOCTYPE') || html.includes('<html')) {
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
  const tempFile = path.join(__dirname, '.processed-edits.json');
  await fs.writeFile(tempFile, JSON.stringify(requests, null, 2));
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