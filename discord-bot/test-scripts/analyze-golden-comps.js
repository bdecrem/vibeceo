import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node analyze-golden-comps.js path/to/golden-comps.json
const goldenCompsFile = process.argv[2];

if (!goldenCompsFile) {
  console.error('Please provide a path to the golden comps file as an argument');
  process.exit(1);
}

async function analyzeGoldenComps() {
  try {
    // Check if file exists
    if (!fs.existsSync(goldenCompsFile)) {
      console.error(`File not found: ${goldenCompsFile}`);
      process.exit(1);
    }

    console.log(`Analyzing golden comps in ${goldenCompsFile}...`);
    
    // Read the golden comps file
    const data = fs.readFileSync(goldenCompsFile, 'utf8');
    let goldenComps;
    
    try {
      goldenComps = JSON.parse(data);
    } catch (err) {
      console.error('Error parsing JSON:', err);
      process.exit(1);
    }
    
    if (!Array.isArray(goldenComps)) {
      console.error('Golden comps file does not contain an array');
      process.exit(1);
    }
    
    console.log(`Found ${goldenComps.length} golden comps`);
    
    // Analyze structure of the first few comps
    const sampleSize = Math.min(5, goldenComps.length);
    console.log(`\nSample of ${sampleSize} golden comps:`);
    
    for (let i = 0; i < sampleSize; i++) {
      const comp = goldenComps[i];
      console.log(`\nGolden Comp #${i + 1}:`);
      
      // Get all keys in the comp object
      const keys = Object.keys(comp);
      console.log(`Keys: ${keys.join(', ')}`);
      
      // Print a summary of each field
      keys.forEach(key => {
        const value = comp[key];
        if (typeof value === 'string') {
          console.log(`${key}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
        } else if (Array.isArray(value)) {
          console.log(`${key}: Array with ${value.length} items`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`${key}: Object with keys ${Object.keys(value).join(', ')}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      });
    }
    
    // Suggest scoring approach based on the structure
    console.log('\nSuggested Scoring Approach:');
    console.log('1. Split your large JSON file into manageable chunks by prompt_id');
    console.log('2. Create a scoring script that loads each split file and the golden comps');
    console.log('3. For each completion in the split files:');
    console.log('   a. Compare with relevant golden comps using criteria like:');
    console.log('      - Keyword matching');
    console.log('      - Semantic similarity');
    console.log('      - Structure adherence');
    console.log('      - Length and format');
    console.log('4. Aggregate scores across all files to get a comprehensive analysis');
    
  } catch (err) {
    console.error('Error analyzing golden comps:', err);
  }
}

analyzeGoldenComps(); 