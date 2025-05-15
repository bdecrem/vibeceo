// Test staff meeting functionality
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { triggerSimpleStaffMeeting } from './dist/lib/discord/simpleStaffMeeting.js';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env.local
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '.env.local'),
  '.env.local'
];

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
  console.error("Failed to load .env.local from any of the attempted paths");
  console.error("Please check if .env.local exists and contains the required variables");
  process.exit(1);
}

async function testStaffMeeting() {
  try {
    console.log("Initializing Discord client...");
    
    // Initialize Discord client with necessary intents
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    
    console.log("Logging in to Discord...");
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`Logged in as ${client.user.tag}`);
    
    // Staff meetings channel ID
    const STAFF_MEETINGS_CHANNEL_ID = "1369356692428423240";
    
    console.log("Waiting 3 seconds for client to fully initialize...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log("Testing simple staff meeting...");
    await triggerSimpleStaffMeeting(STAFF_MEETINGS_CHANNEL_ID, client);
    
    console.log("Staff meeting test completed!");
    
    // Logout and exit after 5 seconds
    setTimeout(() => {
      client.destroy();
      console.log("Client destroyed, exiting...");
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error("Error during staff meeting test:", error);
    process.exit(1);
  }
}

// Run the test
console.log("Starting staff meeting test...");
testStaffMeeting().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 