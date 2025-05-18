import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node prepare-quotes-for-scoring.js [path/to/split/files] [path/to/golden/quotes.jsonl] [output/directory]
const splitDir = process.argv[2];
const goldenQuotesFile = process.argv[3];
const outputDir = process.argv[4] || './quotes-for-scoring';

if (!splitDir || !goldenQuotesFile) {
  console.error('Please provide paths for both split files directory and golden quotes file');
  console.error('Usage: node prepare-quotes-for-scoring.js [path/to/split/files] [path/to/golden/quotes.jsonl] [output/directory]');
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to read JSONL file
async function readJSONLFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const records = [];
  for await (const line of rl) {
    if (line.trim()) {
      try {
        records.push(JSON.parse(line));
      } catch (err) {
        console.error(`Error parsing line: ${line}`, err);
      }
    }
  }
  return records;
}

// Extract coach names from gold standard
function extractCoaches(goldenQuotes) {
  const coaches = new Set();
  goldenQuotes.forEach(quote => {
    if (quote.coach) {
      coaches.add(quote.coach);
    }
  });
  return Array.from(coaches);
}

// Group gold standard quotes by coach
function groupQuotesByCoach(goldenQuotes) {
  const quotesByCoach = {};
  
  goldenQuotes.forEach(quote => {
    if (!quotesByCoach[quote.coach]) {
      quotesByCoach[quote.coach] = {
        gold: [],
        borderline: []
      };
    }
    
    if (quote.quality === 'gold') {
      quotesByCoach[quote.coach].gold.push(quote.text);
    } else if (quote.quality === 'borderline') {
      quotesByCoach[quote.coach].borderline.push(quote.text);
    }
  });
  
  return quotesByCoach;
}

// Main function
async function main() {
  try {
    // Load gold standard quotes
    console.log(`Loading golden quotes from ${goldenQuotesFile}...`);
    const goldenQuotes = await readJSONLFile(goldenQuotesFile);
    console.log(`Loaded ${goldenQuotes.length} golden quotes`);
    
    // Extract coaches and group quotes by coach
    const coaches = extractCoaches(goldenQuotes);
    const quotesByCoach = groupQuotesByCoach(goldenQuotes);
    
    console.log(`Found ${coaches.length} coaches: ${coaches.join(', ')}`);
    
    // Get all split files
    const files = fs.readdirSync(splitDir).filter(file => file.endsWith('.json'));
    console.log(`Found ${files.length} split files to process`);
    
    // Create coaches reference file
    const coachesReference = {
      coaches: coaches,
      quotesByCoach: quotesByCoach
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'coaches_reference.json'), 
      JSON.stringify(coachesReference, null, 2)
    );
    
    // Process each split file - create batches for scoring
    let batchCounter = 0;
    const batchSize = 10; // Number of files to include in each batch
    let currentBatch = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(splitDir, file);
      
      console.log(`Processing ${file} (${i+1}/${files.length})...`);
      
      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const completions = JSON.parse(fileContent);
      
      if (!Array.isArray(completions)) {
        console.warn(`File ${file} does not contain an array, skipping`);
        continue;
      }
      
      // Format the completions for scoring
      const formattedCompletions = completions.map(completion => {
        return {
          completion_id: completion.completion_id,
          prompt_id: completion.prompt_id,
          response: completion.response
        };
      });
      
      // Add to current batch
      currentBatch.push({
        file: file,
        completions: formattedCompletions
      });
      
      // If we've reached batch size or this is the last file, save the batch
      if (currentBatch.length >= batchSize || i === files.length - 1) {
        const batchFile = path.join(outputDir, `batch_${batchCounter}.json`);
        fs.writeFileSync(batchFile, JSON.stringify(currentBatch, null, 2));
        console.log(`Created batch ${batchCounter} with ${currentBatch.length} files (${currentBatch.reduce((sum, b) => sum + b.completions.length, 0)} completions)`);
        
        // Reset batch
        currentBatch = [];
        batchCounter++;
      }
    }
    
    console.log(`\nProcessing complete!`);
    console.log(`Created ${batchCounter} batches for scoring`);
    console.log(`Output directory: ${path.resolve(outputDir)}`);
    console.log(`\nNext step: Use 'node score-batch.js [path/to/batch] [path/to/coaches_reference.json] [output/file]' to score each batch`);
    
  } catch (err) {
    console.error('Error in main process:', err);
  }
}

main(); 