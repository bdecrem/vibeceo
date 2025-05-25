import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input and output file paths
const inputFile = path.join(__dirname, '../experiments-cursor/completions.jsonl');
// Save the CSV file in the same folder as the input file
const inputDir = path.dirname(inputFile);
const outputFile = path.join(inputDir, 'completions.csv');

// Read and process the JSONL file
try {
  const data = fs.readFileSync(inputFile, 'utf8');
  const lines = data.trim().split('\n');
  
  // Create a CSV header from the keys of the first object
  let csvContent = '';
  if (lines.length > 0) {
    const firstObject = JSON.parse(lines[0]);
    const headers = Object.keys(firstObject);
    csvContent = headers.join(',') + '\n';
    
    // Process each line
    lines.forEach(line => {
      if (line.trim()) {
        const obj = JSON.parse(line);
        const values = headers.map(header => {
          // Handle values that need escaping (contains commas, quotes, or newlines)
          let value = obj[header] || '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            // Escape quotes by doubling them and enclose in quotes
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      }
    });
    
    // Write to output file
    fs.writeFileSync(outputFile, csvContent);
    console.log(`Conversion successful. CSV saved to ${outputFile}`);
  } else {
    console.log('Input file is empty');
  }
} catch (error) {
  console.error('Error during conversion:', error);
} 