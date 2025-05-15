import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { triggerStatusReport } from "./dist/lib/discord/argumentGenerator.js";

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
  console.log("Starting Status Report test...");
  
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
      // Trigger status report
      console.log("Triggering status report...");
      await triggerStatusReport(GENERAL_CHANNEL_ID, client);
      
      console.log("Status report completed");
      
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