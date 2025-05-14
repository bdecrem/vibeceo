import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { triggerArgument } from "./dist/lib/discord/argumentGenerator.js";

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  process.exit(1);
}

// Primary Discord channel ID (General channel)
const GENERAL_CHANNEL_ID = "1354474492629618831";

async function main() {
  // Get prompt ID from command line arguments
  const promptId = process.argv[2] || "status-report";
  
  console.log(`Starting Argument Generator test for prompt '${promptId}'...`);
  
  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  
  // Connect to Discord
  console.log("Connecting to Discord...");
  client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
      // Trigger argument generation with the specified prompt ID
      console.log(`Triggering argument generation for '${promptId}'...`);
      await triggerArgument(promptId, GENERAL_CHANNEL_ID, client);
      
      console.log(`Argument generation for '${promptId}' completed`);
      
      // Allow time for messages to be sent before disconnecting
      setTimeout(() => {
        client.destroy();
        console.log("Test completed, client disconnected");
        process.exit(0);
      }, 10000);
    } catch (error) {
      console.error("Error in test:", error);
      client.destroy();
      process.exit(1);
    }
  });
  
  // Start Discord client
  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 