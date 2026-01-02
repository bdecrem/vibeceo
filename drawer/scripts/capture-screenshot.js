#!/usr/bin/env node
/**
 * Extract a base64 screenshot from Puppeteer MCP output and save to web/public/amber/
 *
 * Usage:
 *   node capture-screenshot.js <json-file> <output-name>
 *
 * Example:
 *   node capture-screenshot.js /path/to/mcp-result.txt my-screenshot
 *   # Saves to web/public/amber/my-screenshot.png
 *
 * Workflow:
 * 1. In Claude Code, take screenshot with: mcp__puppeteer__puppeteer_screenshot with encoded=true
 * 2. Note the temp file path from the "Output has been saved to" message
 * 3. Run this script with that path and desired filename
 * 4. Git add, commit, push
 * 5. Reference in blog as /amber/my-screenshot.png
 */

const fs = require('fs');
const path = require('path');

// Get arguments
const jsonFile = process.argv[2];
const outputName = process.argv[3];

if (!jsonFile || !outputName) {
  console.error('Usage: node capture-screenshot.js <json-file> <output-name>');
  console.error('Example: node capture-screenshot.js /path/to/result.txt my-screenshot');
  process.exit(1);
}

// Determine output path
const repoRoot = path.resolve(__dirname, '../..');
const outputPath = path.join(repoRoot, 'web/public/amber', `${outputName}.png`);

try {
  // Read the JSON file
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

  // Find the text entry with the data URI
  const dataUri = data.find(item => item.text && item.text.startsWith('data:image/'));

  if (!dataUri) {
    console.error('No data URI found in JSON file');
    process.exit(1);
  }

  // Extract base64 data (remove "data:image/png;base64," prefix)
  const base64Data = dataUri.text.replace(/^data:image\/\w+;base64,/, '');

  // Decode and write to output file
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Saved ${buffer.length} bytes to ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  git add ${path.relative(repoRoot, outputPath)}`);
  console.log(`  git commit -m "Add screenshot: ${outputName}"`);
  console.log(`  git push origin main`);
  console.log(`\nReference in blog as: /amber/${outputName}.png`);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
