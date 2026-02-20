#!/usr/bin/env node
/**
 * Check that all opengraph-image.tsx files have required exports.
 *
 * Next.js requires OG image route handlers to export:
 * - runtime (usually 'edge')
 * - alt (string)
 * - size ({ width, height })
 * - contentType (string)
 * - default function
 *
 * Exit code 0 = all pass, 1 = issues found.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_DIR = path.join(__dirname, '..', 'web');

function findOgImages() {
  // Use a simple recursive scan instead of shell commands
  const results = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '_archive') continue;
        scan(fullPath);
      } else if (entry.name === 'opengraph-image.tsx') {
        results.push(fullPath);
      }
    }
  }
  scan(path.join(WEB_DIR, 'app'));
  return results;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  // Check required exports
  if (!content.includes('export const runtime')) {
    issues.push(`${relPath}: missing "export const runtime"`);
  }
  if (!content.includes('export const alt')) {
    issues.push(`${relPath}: missing "export const alt"`);
  }
  if (!content.includes('export const size')) {
    issues.push(`${relPath}: missing "export const size"`);
  }
  if (!content.includes('export const contentType')) {
    issues.push(`${relPath}: missing "export const contentType"`);
  }
  if (!content.includes('export default')) {
    issues.push(`${relPath}: missing default export (the Image function)`);
  }

  return issues;
}

function main() {
  const files = findOgImages();
  console.log(`Found ${files.length} opengraph-image.tsx files.`);

  const allIssues = [];
  for (const file of files) {
    const issues = checkFile(file);
    allIssues.push(...issues);
  }

  if (allIssues.length === 0) {
    console.log('✓ All OG image files have required exports.');
    process.exit(0);
  } else {
    console.error(`✗ Found ${allIssues.length} issues:`);
    for (const issue of allIssues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }
}

main();
