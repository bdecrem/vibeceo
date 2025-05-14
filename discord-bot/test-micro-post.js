import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { triggerMicroPost } from "./dist/lib/discord/microPosts.js";

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  process.exit(1);
}

// Get channel ID from environment
const channelId = process.env.DISCORD_CHANNEL_ID;
if (!channelId) {
  console.error("Missing DISCORD_CHANNEL_ID in .env.local");
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

// Connect to Discord
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => {
    console.log("Bot logged in successfully");
    
    // Get the prompt ID from the command line argument
    const promptId = process.argv[2];
    if (!promptId) {
      console.error("Please specify a prompt ID (coach-quotes, crowd-faves, microclass, upcoming-events)");
      client.destroy();
      process.exit(1);
    }

    // Generate and post the content
    console.log(`Generating content for prompt '${promptId}'...`);
    triggerMicroPost(promptId, channelId, client)
      .then(success => {
        console.log(`Micro post ${success ? "completed" : "failed"} for prompt '${promptId}'`);
        client.destroy();
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error("Error:", error);
        client.destroy();
        process.exit(1);
      });
  })
  .catch(error => {
    console.error("Error logging in:", error);
    process.exit(1);
  }); 