import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  initializeWebhooks,
  sendAsCharacter,
  cleanupWebhooks,
} from "./webhooks.js";
import { getWebhookUrls } from "./config.js";
import { sendEventMessage } from "./eventMessages.js";
import { TextChannel, Client } from "discord.js";
import dotenv from "dotenv";

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

// Use the general channel for weekend stories
const WEEKEND_STORY_CHANNEL_ID = "1354474492629618831"; // Same as GENERAL_CHANNEL_ID

// Ensure weekend-stories directory exists
const storiesDir = path.join(process.cwd(), "data", "weekend-stories");
if (!fs.existsSync(storiesDir)) {
  fs.mkdirSync(storiesDir, { recursive: true });
}

// Function to find the latest weekend story file
function getLatestWeekendStoryFile(): string {
  const files = fs
    .readdirSync(storiesDir)
    .filter((file) => file.startsWith("weekend2-story-") && file.endsWith(".json"))
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

// Function to execute the weekend story prompt script
async function generateNewWeekendStory(): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "weekend-story-prompt.js");
    console.log("Executing weekend story prompt script:", scriptPath);

    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing weekend story prompt:", error);
        reject(error);
        return;
      }
      if (stderr) {
        console.error("Script stderr:", stderr);
      }
      console.log("Script stdout:", stdout);
      resolve(stdout);
    });
  });
}

// Map coach names from the story to discord usernames
function mapCoachName(name: string): string {
  // Remove any quotes or special characters
  const cleanName = name.replace(/['"`]/g, "").toLowerCase();
  
  // Map the coach names to their discord names
  switch (cleanName) {
    case 'kailey_sloan':
      return 'kailey';
    case 'venusmetrics':
      return 'venus';
    case 'eljas_council':
      return 'eljas';
    case 'donte_declares':
      return 'donte';
    case 'rohan_pressure':
      return 'rohan';
    case 'alex_actual':
      return 'alex';
    default:
      return cleanName;
  }
}

async function postWeekendStoryToDiscord(client: Client) {
  try {
    // First generate a new weekend story
    console.log("Generating new weekend story...");
    const scriptOutput = await generateNewWeekendStory();
    console.log("Script output received, length:", scriptOutput.length);

    // Then get the latest weekend story file
    const latestStoryPath = getLatestWeekendStoryFile();
    console.log("Reading weekend story file from:", latestStoryPath);

    // Read the weekend story file
    const weekendStory = JSON.parse(
      fs.readFileSync(latestStoryPath, "utf8")
    );

    // Initialize webhooks
    console.log("Initializing webhooks...");
    const webhookUrls = getWebhookUrls();
    cleanupWebhooks(WEEKEND_STORY_CHANNEL_ID);
    await initializeWebhooks(WEEKEND_STORY_CHANNEL_ID, webhookUrls);

    // Get the channel for sending event messages
    const channel = (await client.channels.fetch(
      WEEKEND_STORY_CHANNEL_ID
    )) as TextChannel;
    if (!channel) {
      throw new Error("Weekend story channel not found");
    }

    // Send intro message with story metadata
    const now = new Date();
    console.log("Sending intro message with weekend story");
    await sendEventMessage(
      channel,
      "weekendstory",
      true,
      now.getUTCHours(),
      now.getUTCMinutes()
    );
    
    // Process each scene and post to Discord
    console.log(`Posting ${weekendStory.scenes.length} weekend story scenes...`);
    let successCount = 0;
    let errorCount = 0;

    // Post the story scene by scene
    for (const [sceneIndex, scene] of weekendStory.scenes.entries()) {
      try {
        console.log(`Processing scene ${scene.number}/${weekendStory.scenes.length}`);
        
        // Post the scene intro as a regular message
        const sceneIntro = `**It's ${scene.intro.time} in ${scene.intro.location} and ${scene.intro.behavior}.**`;
        await channel.send(sceneIntro);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        
        // Post each message in the conversation using the appropriate webhook
        for (const message of scene.conversation) {
          const coachName = mapCoachName(message.coach);
          console.log(`Sending message as ${coachName}: ${message.content}`);
          
          try {
            await sendAsCharacter(
              WEEKEND_STORY_CHANNEL_ID,
              coachName,
              message.content
            );
            
            // Add a short delay between messages to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay
          } catch (messageError) {
            console.error(`Error sending message as ${coachName}:`, messageError);
            errorCount++;
          }
        }
        
        successCount++;
        // Add a longer delay between scenes
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay
      } catch (sceneError) {
        console.error(`Error posting scene ${sceneIndex + 1}:`, sceneError);
        errorCount++;
        // Give extra time on errors before trying the next one
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay after error
      }
    }

    console.log(`Weekend story posting complete! Success: ${successCount}, Errors: ${errorCount}`);

    // Send outro message
    await sendEventMessage(
      channel,
      "weekendstory",
      false,
      now.getUTCHours(),
      now.getUTCMinutes()
    );

    console.log("Finished posting weekend story");
    return true; // Indicate success for better handling by callers
  } catch (error) {
    console.error("Error in postWeekendStoryToDiscord:", error);
    throw error;
  }
}

// Export for use in other files
export async function triggerWeekendStory(
  channelId: string,
  client: Client
): Promise<void> {
  console.log("Triggering weekend story...");
  const result = await postWeekendStoryToDiscord(client);
  console.log("Weekend story posting completed with result:", result);
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  // Note: This won't work as a standalone script anymore since it needs a client
  console.error(
    "This module cannot be run directly as it requires a Discord client"
  );
  process.exit(1);
} 