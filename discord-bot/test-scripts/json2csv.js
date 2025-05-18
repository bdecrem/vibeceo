#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Input and output directories
const currentDir = process.cwd();
const QUOTES_DIR = path.join(currentDir, 'quotes-for-scoring');
const OUTPUT_DIR = path.join(QUOTES_DIR, 'csv');

// Create the output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

/**
 * Escapes a string for CSV output
 */
function escapeForCSV(str) {
  if (typeof str !== 'string') return '';
  // If the string contains quotes, commas, or newlines, escape it properly
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a batch JSON file to CSV
 */
function convertBatchToCSV(batchFile) {
  const batchPath = path.join(QUOTES_DIR, batchFile);
  const csvPath = path.join(OUTPUT_DIR, batchFile.replace('.json', '.csv'));
  
  console.log(`Converting ${batchFile} to CSV...`);
  
  try {
    // Read and parse the JSON file
    const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    
    // CSV header
    let csvContent = 'completion_id,prompt_id,response\n';
    
    // Add each item as a CSV row
    for (const item of batchData) {
      const completionId = escapeForCSV(item.completion_id);
      const promptId = escapeForCSV(item.prompt_id);
      const response = escapeForCSV(item.response);
      
      csvContent += `${completionId},${promptId},${response}\n`;
    }
    
    // Write the CSV file
    fs.writeFileSync(csvPath, csvContent);
    console.log(`✅ Created ${csvPath}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error converting ${batchFile}: ${error.message}`);
    return false;
  }
}

// Find all batch_*.json files (but not _for_ai files)
const batchFiles = fs.readdirSync(QUOTES_DIR)
  .filter(file => file.match(/^batch_\d+\.json$/) && !file.includes('_for_ai'));

console.log(`Found ${batchFiles.length} batch files to convert.`);

// Convert each batch file to CSV
let successCount = 0;
for (const batchFile of batchFiles) {
  if (convertBatchToCSV(batchFile)) {
    successCount++;
  }
}

console.log(`\nConversion complete! ${successCount}/${batchFiles.length} files converted successfully.`);
console.log(`CSV files are located in: ${OUTPUT_DIR}`); 