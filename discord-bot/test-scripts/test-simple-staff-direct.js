// Test script for direct testing of simplestaffmeeting functionality
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from 'discord.js';
import { triggerSimpleStaffMeeting } from './dist/lib/discord/simpleStaffMeeting.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env.local
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '.env.local'),
  '.env.local'
];

// Load environment variables from multiple potential locations
let envLoaded = false;
for (const envPath of envPaths) {
  console.log("Trying to load environment from:", envPath);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log("Successfully loaded environment from:", envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error("Failed to load environment variables from any of the attempted paths");
  process.exit(1);
}

// Staff meetings channel ID - hardcoded to ensure we're using the right channel
const STAFF_MEETINGS_CHANNEL_ID = "1369356692428423240";

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Login and run test
async function runTest() {
  try {
    console.log("Logging in to Discord...");
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`Logged in as ${client.user.tag}`);
    
    // Wait a moment for connection to stabilize
    console.log("Waiting 3 seconds before proceeding...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log("\n=== STARTING DIRECT SIMPLESTAFFMEETING TEST ===");
    console.log(`Using channel ID: ${STAFF_MEETINGS_CHANNEL_ID}`);
    
    // Trigger the simple staff meeting directly with the staff channel ID
    await triggerSimpleStaffMeeting(STAFF_MEETINGS_CHANNEL_ID, client);
    
    console.log("\n=== TEST COMPLETED ===");
    console.log("Cleaning up...");
    
    // Wait a moment before disconnecting
    await new Promise(resolve => setTimeout(resolve, 5000));
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error in test:", error);
    client.destroy();
    process.exit(1);
  }
}

// Start the test
runTest().catch(error => {
  console.error("Unhandled error:", error);
  client.destroy();
  process.exit(1);
}); 