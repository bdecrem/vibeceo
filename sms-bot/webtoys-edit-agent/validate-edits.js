#!/usr/bin/env node

/**
 * Validate Edits
 * Checks that edited HTML is safe and preserves functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load processed edits from temp file or worker input
 */
async function loadProcessedEdits() {
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
  
  // Normal mode: read from processed file
  try {
    const tempFile = path.join(__dirname, '.processed-edits.json');
    const data = await fs.readFile(tempFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No processed edits file found');
    return [];
  }
}

/**
 * Validate HTML structure and safety
 */
function validateHTML(html, appType) {
  console.log(`  🔍 Validating HTML (${html.length} chars, type: ${appType})`);
  
  const issues = [];
  
  // 1. Basic HTML structure
  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    issues.push('Missing DOCTYPE or html tag');
  }
  
  // 2. Check for balanced tags (simplified approach)
  const openTags = (html.match(/<[^\/][^>]*>/g) || []).length;
  const closeTags = (html.match(/<\/[^>]*>/g) || []).length;
  
  
  // Generous balance check for complex generated content
  // Allow up to 20 tag difference to account for meta tags, self-closing tags, etc.
  if (Math.abs(openTags - closeTags) > 20) {
    issues.push('Severely unbalanced HTML tags');
  }
  
  // 3. Check for dangerous code
  const dangerousPatterns = [
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,  // Only block new Function(), not all Function references
    /document\.write\s*\(/gi,
    /innerHTML\s*=.*<script/gi,
    /on\w+\s*=\s*"[^"]*javascript:/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      issues.push(`Potentially dangerous code pattern: ${pattern.source}`);
    }
  }
  
  // 4. App-specific validations
  if (appType === 'zad') {
    // ZAD apps must preserve API endpoints
    if (!html.includes('/api/zad/save') || !html.includes('/api/zad/load')) {
      issues.push('ZAD app missing required API endpoints');
    }
    
    if (!html.includes('window.APP_ID') && !html.includes('window.USER_ID')) {
      issues.push('ZAD app missing required window variables');
    }
  } else if (appType === 'game') {
    // Games should have basic game elements
    if (html.includes('canvas') && !html.includes('requestAnimationFrame')) {
      issues.push('Canvas game missing animation frame');
    }
    
    if (html.includes('canvas') && !html.includes('getContext')) {
      issues.push('Canvas game missing context usage');
    }
  }
  
  // 5. Mobile responsiveness check
  if (!html.includes('viewport') && !html.includes('width=device-width')) {
    issues.push('Missing mobile viewport meta tag');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings: issues.filter(i => !i.includes('missing') && !i.includes('dangerous'))
  };
}

/**
 * Validate a single edit
 */
function validateEdit(edit) {
  console.log(`\n✓ Validating edit for app: ${edit.wtaf_content?.app_slug || 'unknown'}`);
  
  if (!edit.editResult || !edit.editResult.success) {
    console.log('  ❌ Edit failed during processing - skipping validation');
    return { isValid: false, reason: 'Edit processing failed' };
  }
  
  const { editedHtml } = edit.editResult;
  const appType = edit.content?.detectedType || 'standard';
  
  // Validate the edited HTML
  const validation = validateHTML(editedHtml, appType);
  
  if (validation.isValid) {
    console.log('  ✅ Validation passed');
    edit.validationResult = { isValid: true };
  } else {
    console.log('  ❌ Validation failed:');
    validation.issues.forEach(issue => {
      console.log(`    - ${issue}`);
    });
    edit.validationResult = { 
      isValid: false, 
      issues: validation.issues 
    };
  }
  
  // Show warnings but don't fail validation
  if (validation.warnings.length > 0) {
    console.log('  ⚠️  Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`    - ${warning}`);
    });
  }
  
  return edit.validationResult;
}

/**
 * Save validated edits for next stage
 */
async function saveValidatedEdits(edits) {
  // In worker mode, update the same file
  if (process.env.WORKER_INPUT) {
    await fs.writeFile(process.env.WORKER_INPUT, JSON.stringify(edits, null, 2));
  } else {
    // Normal mode: write to validated file
    const tempFile = path.join(__dirname, '.validated-edits.json');
    await fs.writeFile(tempFile, JSON.stringify(edits, null, 2));
  }
}

// Main execution
async function main() {
  console.log('🎨 Webtoys Edit Agent - Validation Phase');
  console.log('=' + '='.repeat(50));
  
  // Load processed edits
  const edits = await loadProcessedEdits();
  
  if (edits.length === 0) {
    console.log('No processed edits to validate');
    process.exit(1);
  }
  
  console.log(`✓ Validating ${edits.length} processed edit(s)`);
  
  // Validate each edit
  let validCount = 0;
  
  for (const edit of edits) {
    const validation = validateEdit(edit);
    if (validation.isValid) {
      validCount++;
    }
  }
  
  // Save results for deployment stage
  await saveValidatedEdits(edits);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Validated ${validCount}/${edits.length} edits successfully`);
  
  if (validCount > 0) {
    console.log('Ready for deployment stage');
    process.exit(0);
  } else {
    console.log('No valid edits to deploy');
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