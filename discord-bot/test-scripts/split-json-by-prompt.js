import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node split-json-by-prompt.js path/to/your/large-file.json output/directory
const inputFile = process.argv[2];
const outputDir = process.argv[3] || './split-output';

if (!inputFile) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Track files and writers
const fileWriters = new Map();
let totalMessages = 0;
let processedPromptIds = new Set();

async function splitJsonByPrompt() {
  console.log(`Splitting ${inputFile} by prompt ID...`);
  console.log(`Output directory: ${outputDir}`);
  
  try {
    // Create stream for reading the file line by line
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let currentMessage = '';
    let insideMessage = false;
    let bracketCount = 0;
    let lineCount = 0;
    
    for await (const line of rl) {
      lineCount++;
      
      // Process each line
      if (!insideMessage && (line.trim().startsWith('{') || line.includes('{'))) {
        insideMessage = true;
        bracketCount = 0;
        currentMessage = '';
      }
      
      if (insideMessage) {
        currentMessage += line + '\n';
        
        // Count brackets to accurately detect end of JSON objects
        bracketCount += (line.match(/{/g) || []).length;
        bracketCount -= (line.match(/}/g) || []).length;
        
        if (bracketCount === 0 && line.includes('}')) {
          // End of a message
          insideMessage = false;
          
          try {
            // Clean up the message (remove trailing comma)
            let cleanMessage = currentMessage.trim();
            if (cleanMessage.endsWith(',')) {
              cleanMessage = cleanMessage.slice(0, -1);
            }
            
            // Parse the message to extract the prompt_id
            const message = JSON.parse(cleanMessage);
            totalMessages++;
            
            if (message.prompt_id) {
              const promptId = message.prompt_id;
              processedPromptIds.add(promptId);
              
              // Create or get writer for this promptId
              if (!fileWriters.has(promptId)) {
                const outputFile = path.join(outputDir, `prompt_${promptId}.json`);
                const writer = fs.createWriteStream(outputFile);
                writer.write('[\n'); // Start the JSON array
                fileWriters.set(promptId, { writer, count: 0 });
                console.log(`Created new file for prompt_id: ${promptId}`);
              }
              
              const writerInfo = fileWriters.get(promptId);
              
              // Add a comma if this isn't the first message
              if (writerInfo.count > 0) {
                writerInfo.writer.write(',\n');
              }
              
              writerInfo.writer.write(cleanMessage);
              writerInfo.count++;
            } else {
              console.warn(`Message without prompt_id at line ${lineCount}`);
            }
          } catch (err) {
            console.error(`Error parsing message at line ${lineCount}:`, err);
            console.error(`Message content: ${currentMessage.substring(0, 500)}...`);
          }
        }
      }
      
      // Log progress periodically
      if (lineCount % 10000 === 0) {
        console.log(`Processed ${lineCount} lines, ${totalMessages} messages, ${processedPromptIds.size} unique prompt_ids`);
      }
    }
    
    // Close all file writers
    for (const [promptId, writerInfo] of fileWriters.entries()) {
      writerInfo.writer.write('\n]'); // End the JSON array
      writerInfo.writer.end();
      console.log(`Completed file for prompt_id: ${promptId} with ${writerInfo.count} messages`);
    }
    
    console.log(`\nProcessing complete!`);
    console.log(`Total lines processed: ${lineCount}`);
    console.log(`Total messages: ${totalMessages}`);
    console.log(`Total unique prompt_ids: ${processedPromptIds.size}`);
    console.log(`Files created: ${fileWriters.size}`);
    console.log(`Output directory: ${path.resolve(outputDir)}`);
    
  } catch (err) {
    console.error('Error processing file:', err);
  }
}

splitJsonByPrompt();
 