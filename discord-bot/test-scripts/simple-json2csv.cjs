#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define paths
const QUOTES_DIR = path.join(__dirname, '..', 'quotes-for-scoring');
const CSV_DIR = path.join(__dirname, '..', 'quotes-for-scoring', 'csv');

// Create CSV directory if it doesn't exist
try {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`Error creating directory: ${err.message}`);
  process.exit(1);
}

// Escape function for CSV
function escapeCSV(value) {
  if (typeof value !== 'string') return '';
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Process each batch file
function processBatchFile(batchFile) {
  try {
    console.log(`Processing ${batchFile}...`);
    
    // Read the JSON file
    const jsonPath = path.join(QUOTES_DIR, batchFile);
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Prepare CSV data
    let csvLines = ['completion_id,prompt_id,response'];
    
    // Add data rows
    jsonData.forEach(item => {
      const completion_id = escapeCSV(item.completion_id || '');
      const prompt_id = escapeCSV(item.prompt_id || '');
      const response = escapeCSV(item.response || '');
      
      csvLines.push(`${completion_id},${prompt_id},${response}`);
    });
    
    // Write to CSV file
    const csvPath = path.join(CSV_DIR, batchFile.replace('.json', '.csv'));
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    
    console.log(`✅ Created ${csvPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${batchFile}: ${error.message}`);
    return false;
  }
}

// Find batch files
console.log('Finding batch files...');
try {
  const batchFiles = fs.readdirSync(QUOTES_DIR)
    .filter(file => file.match(/^batch_\d+\.json$/) && !file.includes('_for_ai'));
  
  console.log(`Found ${batchFiles.length} batch files`);
  
  // Process each file
  let successCount = 0;
  for (const batchFile of batchFiles) {
    if (processBatchFile(batchFile)) {
      successCount++;
    }
  }
  
  console.log(`\nConversion complete! ${successCount}/${batchFiles.length} files converted successfully.`);
  console.log(`CSV files are located in: ${CSV_DIR}`);
} catch (error) {
  console.error(`❌ Error listing files: ${error.message}`);
} 