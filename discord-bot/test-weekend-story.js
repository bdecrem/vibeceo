import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Import the weekend story module dynamically
async function runTest() {
  try {
    // Import the weekend story module
    const { triggerWeekendStory } = await import("./lib/discord/weekend-story.js");
    
    // Log in to Discord
    console.log("Logging in to Discord...");
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log("Logged in successfully!");
    
    // Get the channel ID from environment variables
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      throw new Error("DISCORD_CHANNEL_ID is not set in environment variables");
    }
    
    // Trigger the weekend story
    console.log(`Triggering weekend story in channel ${channelId}...`);
    await triggerWeekendStory(channelId, client);
    console.log("Weekend story posting completed successfully!");
    
    // Exit after a short delay to allow for any pending operations
    setTimeout(() => {
      console.log("Test completed, exiting...");
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error("Error in test:", error);
    process.exit(1);
  }
}

// Run the test
console.log("Starting weekend story test...");
runTest();