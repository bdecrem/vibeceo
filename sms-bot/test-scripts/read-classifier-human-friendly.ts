/**
 * ADMIN INFRASTRUCTURE: Raw Classifier Content Reader
 * 
 * Shows the ACTUAL FULL CONTENT of classifier.json formatted cleanly
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load and display raw classifier content
 */
async function main() {
    try {
        const promptPath = join(__dirname, '..', '..', 'content', 'classifier.json');
        const content = await readFile(promptPath, 'utf8');
        const classifier = JSON.parse(content);
        
        // Just show the actual content, formatted cleanly
        console.log(classifier.content);
        
    } catch (error) {
        console.error("Error reading classifier:", error);
        process.exit(1);
    }
}

main(); 