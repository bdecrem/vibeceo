import { Client, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Setup paths
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

// Create the Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Channel ID for weekend stories (general channel)
const WEEKEND_STORY_CHANNEL_ID = "1354474492629618831";

// Function to find the latest weekend story file
function getLatestWeekendStoryFile() {
  const storiesDir = path.join(__dirname, "data", "weekend-stories");
  const files = fs
    .readdirSync(storiesDir)
    .filter((file) => file.startsWith("weekend-story-") && file.endsWith(".json"))
    .map((file) => ({
      name: file,
      path: path.join(storiesDir, file),
      timestamp: fs.statSync(path.join(storiesDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

  if (files.length === 0) {
    throw new Error("No weekend story files found");
  }

  return files[0].path;
}

async function main() {
  try {
    console.log("Starting Discord client...");
    
    // Check if there's a story file available
    const latestStoryPath = getLatestWeekendStoryFile();
    console.log("Found latest weekend story file:", latestStoryPath);
    
    // Import the functions from weekend-story.js (compiled from .ts)
    const { triggerWeekendStory } = await import('./dist/lib/discord/weekend-story.js');
    
    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log("Discord client logged in");
    
    // Wait for the client to be ready
    await new Promise((resolve) => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('ready', () => {
          console.log(`Logged in as ${client.user.tag}`);
          resolve();
        });
      }
    });
    
    // Trigger the weekend story (which will use the latest story file)
    console.log("Triggering weekend story...");
    await triggerWeekendStory(WEEKEND_STORY_CHANNEL_ID, client);
    
    console.log("Weekend story process complete");
    
    // Close the Discord client after a short delay
    setTimeout(() => {
      client.destroy();
      console.log("Discord client destroyed");
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error("Error in main function:", error);
    if (client) client.destroy();
    process.exit(1);
  }
}

// Run the main function
main(); 