import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node analyze-json-structure.js path/to/your/large-file.json
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

// Function to analyze the structure of the JSON file
async function analyzeJsonStructure() {
  try {
    // Open the file for reading
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    let firstLine = '';
    let isArray = false;
    const uniquePromptIds = new Set();
    
    // We'll read just enough to understand the structure
    for await (const line of rl) {
      lineCount++;
      
      if (lineCount === 1) {
        firstLine = line.trim();
        isArray = firstLine.startsWith('[');
        console.log(`File starts with: ${firstLine.substring(0, 100)}...`);
        console.log(`JSON appears to contain a${isArray ? 'n array' : ' object'}`);
      }
      
      // Look for promptId patterns to count unique prompts
      const promptIdMatch = line.match(/"promptId":\s*"([^"]+)"/g);
      if (promptIdMatch) {
        promptIdMatch.forEach(match => {
          const id = match.split(':')[1].trim().replace(/"/g, '');
          uniquePromptIds.add(id);
        });
      }
      
      // Only read the first 100 lines to get a sample
      if (lineCount >= 100) break;
    }

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\nFile Analysis Summary:`);
    console.log(`File size: ${fileSizeMB} MB`);
    console.log(`Unique prompt IDs found in sample: ${uniquePromptIds.size}`);
    console.log(`Estimated total entries: ${isArray ? 'Approximately 6000 (based on user info)' : 'Unknown'}`);
    
    console.log(`\nRecommended approach:`);
    console.log(`1. Split the file into smaller chunks by prompt ID`);
    console.log(`2. Process each chunk separately`);
    console.log(`3. Aggregate results after processing`);
    
  } catch (err) {
    console.error('Error analyzing file:', err);
  }
}

analyzeJsonStructure(); 