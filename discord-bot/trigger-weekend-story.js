// Script to manually trigger weekend story generation
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, ".env.local");
console.log("Loading environment from:", envPath);
dotenv.config({ path: envPath });

// Execute the weekend story prompt script
console.log("Manually generating new weekend story...");
const scriptPath = path.join(__dirname, "weekend-story-prompt.js");

exec(`node ${scriptPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error("Error executing weekend story prompt:", error);
    process.exit(1);
  }
  
  if (stderr) {
    console.error("Script stderr:", stderr);
  }
  
  console.log("Script stdout:", stdout);
  console.log("Weekend story generation complete. Start the bot to use the new story.");
}); 