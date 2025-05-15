// Test waterheater functionality
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { triggerWaterheaterChat } from './dist/lib/discord/handlers.js';
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

async function testWaterheater() {
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
    
    // General channel ID
    const GENERAL_CHANNEL_ID = "1354474492629618831";
    
    console.log("Waiting 3 seconds for client to fully initialize...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create a test incident
    const testIncident = {
      text: "Lost an important document due to a system crash",
      intro: "One of our coaches is stressed about losing data."
    };
    
    // Specify a coach ID for testing
    const testCoachId = "donte";
    
    console.log("Testing waterheater with specific coach and incident...");
    console.log(`Coach: ${testCoachId}`);
    console.log(`Incident: ${testIncident.text}`);
    
    await triggerWaterheaterChat(GENERAL_CHANNEL_ID, client, testIncident, testCoachId);
    
    console.log("Waterheater test completed!");
    
    // Logout and exit after 10 seconds
    setTimeout(() => {
      client.destroy();
      console.log("Client destroyed, exiting...");
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error("Error during waterheater test:", error);
    process.exit(1);
  }
}

// Run the test
console.log("Starting waterheater test...");
testWaterheater().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 