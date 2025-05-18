import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const inputDir = path.join(__dirname, '..', 'quotes-for-scoring');
const outputDir = path.join(__dirname, '..', 'quotes-for-scoring', 'csv-output');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to escape CSV values
function escapeCSV(value) {
  if (typeof value !== 'string') return value;
  // If value contains commas, newlines, or quotes, wrap in quotes and escape inner quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Function to convert a single JSON file to CSV
function convertToCSV(jsonFile) {
  const baseName = path.basename(jsonFile, '.json');
  const outputFile = path.join(outputDir, `${baseName}.csv`);
  
  console.log(`Converting ${jsonFile} to ${outputFile}`);
  
  try {
    // Read and parse JSON file
    const jsonData = JSON.parse(fs.readFileSync(path.join(inputDir, jsonFile), 'utf8'));
    
    // CSV header
    const csvHeader = 'completion_id,prompt_id,coach,response\n';
    
    // CSV rows
    const csvRows = jsonData.map(item => {
      const completionId = escapeCSV(item.completion_id || '');
      const promptId = escapeCSV(item.prompt_id || '');
      
      // Try to extract the coach name if it exists
      let coach = '';
      if (item.coach) {
        coach = escapeCSV(item.coach);
      }
      
      // Escape the response text for CSV
      const response = escapeCSV(item.response || '');
      
      return `${completionId},${promptId},${coach},${response}`;
    }).join('\n');
    
    // Write CSV file
    fs.writeFileSync(outputFile, csvHeader + csvRows);
    console.log(`Successfully converted ${jsonFile} to CSV`);
  } catch (error) {
    console.error(`Error converting ${jsonFile}: ${error.message}`);
  }
}

// Get all JSON files in the input directory
const jsonFiles = fs.readdirSync(inputDir)
  .filter(file => file.endsWith('.json') && !file.includes('coaches_reference'));

// Convert each file
console.log(`Found ${jsonFiles.length} JSON files to convert`);
jsonFiles.forEach(convertToCSV);

console.log('Conversion complete! CSV files are in the quotes-for-scoring/csv-output directory'); 