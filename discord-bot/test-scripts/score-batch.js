import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node score-batch.js [path/to/batch.json] [path/to/coaches_reference.json] [output/file]
const batchFile = process.argv[2];
const coachesReferenceFile = process.argv[3];
const outputFile = process.argv[4] || './scored_batch.json';

if (!batchFile || !coachesReferenceFile) {
  console.error('Please provide paths for both batch file and coaches reference file');
  console.error('Usage: node score-batch.js [path/to/batch.json] [path/to/coaches_reference.json] [output/file]');
  process.exit(1);
}

// Function to format the batch for AI scoring
function formatBatchForScoring(batch, coachesReference) {
  const formattedBatch = {
    coachesReference: coachesReference,
    completionsToScore: []
  };
  
  // Process each file in the batch
  batch.forEach(fileData => {
    fileData.completions.forEach(completion => {
      formattedBatch.completionsToScore.push({
        completion_id: completion.completion_id,
        prompt_id: completion.prompt_id,
        response: completion.response
      });
    });
  });
  
  return formattedBatch;
}

// Function to save the scored batch
function saveScores(scores, outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(scores, null, 2));
  console.log(`Saved scores to ${outputFile}`);
}

// Main function to process the batch
async function main() {
  try {
    // Load batch and coaches reference
    console.log(`Loading batch from ${batchFile}...`);
    const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
    
    console.log(`Loading coaches reference from ${coachesReferenceFile}...`);
    const coachesReference = JSON.parse(fs.readFileSync(coachesReferenceFile, 'utf8'));
    
    // Format the batch for scoring
    const formattedBatch = formatBatchForScoring(batch, coachesReference);
    
    // Calculate the total number of completions
    const totalCompletions = formattedBatch.completionsToScore.length;
    console.log(`Prepared ${totalCompletions} completions for scoring`);
    
    // Create a formatted file for AI scoring
    const scoringInputFile = batchFile.replace('.json', '_for_ai.json');
    fs.writeFileSync(scoringInputFile, JSON.stringify(formattedBatch, null, 2));
    
    console.log(`\nScoring input file created at: ${scoringInputFile}`);
    console.log(`\nNow you can copy this file content and paste it to Claude 3.7 Sonnet for scoring.`);
    console.log(`Ask Claude to evaluate each completion by identifying which coach it sounds like and scoring it on a scale of 1-10.`);
    console.log(`\nAfter receiving Claude's scored results, save them to ${outputFile}`);
    
  } catch (err) {
    console.error('Error processing batch:', err);
  }
}

main(); 