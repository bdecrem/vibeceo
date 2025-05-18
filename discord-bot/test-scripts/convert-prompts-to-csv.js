import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input and output directories
const SPLIT_OUTPUT_DIR = path.join(__dirname, '..', 'experiments-chatgpt', '200-prompts', 'split-output');
const CSV_OUTPUT_DIR = path.join(__dirname, '..', 'experiments-chatgpt', '200-prompts', 'csv-output');

// Create the output directory if it doesn't exist
if (!fs.existsSync(CSV_OUTPUT_DIR)) {
  fs.mkdirSync(CSV_OUTPUT_DIR, { recursive: true });
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
 * Converts a prompt JSON file to CSV
 */
function convertPromptToCSV(promptFile) {
  const promptPath = path.join(SPLIT_OUTPUT_DIR, promptFile);
  const csvPath = path.join(CSV_OUTPUT_DIR, promptFile.replace('.json', '.csv'));
  
  console.log(`Converting ${promptFile} to CSV...`);
  
  try {
    // Read and parse the JSON file
    const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
    
    // CSV header
    let csvContent = 'completion_id,prompt_id,response\n';
    
    // Check the structure of the data
    let completions = [];
    if (Array.isArray(promptData)) {
      completions = promptData;
    } else if (promptData.completions && Array.isArray(promptData.completions)) {
      completions = promptData.completions;
    } else {
      throw new Error('Unexpected data structure in JSON file');
    }
    
    // Add each item as a CSV row
    for (const item of completions) {
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
    console.error(`❌ Error converting ${promptFile}: ${error.message}`);
    return false;
  }
}

// Find all prompt_*.json files
const promptFiles = fs.readdirSync(SPLIT_OUTPUT_DIR)
  .filter(file => file.match(/^prompt_meta_\d+_p\d+\.json$/));

console.log(`Found ${promptFiles.length} prompt files to convert.`);

// Convert each prompt file to CSV
let successCount = 0;
for (const promptFile of promptFiles) {
  if (convertPromptToCSV(promptFile)) {
    successCount++;
  }
}

console.log(`\nConversion complete! ${successCount}/${promptFiles.length} files converted successfully.`);
console.log(`CSV files are located in: ${CSV_OUTPUT_DIR}`); 