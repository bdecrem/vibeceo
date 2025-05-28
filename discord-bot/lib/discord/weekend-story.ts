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
import { getLocationAndTime } from "./locationTime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local only in development
if (process.env.NODE_ENV !== "production") {
	const envPath = path.resolve(process.cwd(), ".env.local");
	console.log("Loading environment from:", envPath);
	const result = dotenv.config({ path: envPath });
	if (result.error) {
		console.error("Error loading .env.local:", result.error);
		process.exit(1);
	}
} else {
	console.log("Production environment detected, using Railway environment variables");
}

// Read channel ID from environment variable with fallback instead of importing from bot.js
// This avoids circular dependencies
const WEEKEND_STORY_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID || '1354474492629618831';

// Ensure weekend-stories directory exists
const storiesDir = path.join(process.cwd(), "data", "weekend-stories");
if (!fs.existsSync(storiesDir)) {
  fs.mkdirSync(storiesDir, { recursive: true });
}

// File to track the current scene index
const sceneIndexFile = path.join(process.cwd(), "data", "weekend-stories", "current-scene-index.json");

// Function to initialize or reset the scene index
function resetSceneIndex(): void {
  const data = {
    storyFile: "",
    currentIndex: 0,
    totalScenes: 24,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(sceneIndexFile, JSON.stringify(data, null, 2), "utf8");
  console.log("Scene index reset to 0");
}

// Function to force a new weekend story arc on bot startup
export async function resetWeekendStory(): Promise<void> {
  console.log("Resetting weekend story on bot startup");
  resetSceneIndex();
  
  try {
    // Generate a new story
    console.log("Generating new weekend story for bot startup...");
    await generateNewWeekendStory();
    console.log("New weekend story generated on bot startup");
  } catch (error) {
    console.error("Error generating new weekend story on bot startup:", error);
  }
}

// Function to get the current scene index
function getCurrentSceneData(): { storyFile: string; currentIndex: number; totalScenes: number; lastUpdated: string } {
  if (!fs.existsSync(sceneIndexFile)) {
    resetSceneIndex();
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(sceneIndexFile, "utf8"));
    return data;
  } catch (error) {
    console.error("Error reading scene index file:", error);
    resetSceneIndex();
    return { storyFile: "", currentIndex: 0, totalScenes: 24, lastUpdated: new Date().toISOString() };
  }
}

// Function to update the scene index
function updateSceneIndex(storyFile: string, currentIndex: number, totalScenes: number): void {
  const data = {
    storyFile,
    currentIndex,
    totalScenes,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(sceneIndexFile, JSON.stringify(data, null, 2), "utf8");
  console.log(`Scene index updated to ${currentIndex}/${totalScenes}`);
}

// Function to find the latest weekend story file
function getLatestWeekendStoryFile(): string {
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

// Function to execute the weekend story prompt script
async function generateNewWeekendStory(): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "weekend-story-prompt.js");
    console.log("Executing weekend story prompt script:", scriptPath);

    // Pass current environment variables to the script, which will include FAST_SCHEDULE if set
    const env = process.env;
    
    exec(`node ${scriptPath}`, { env }, (error, stdout, stderr) => {
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

async function postNextWeekendStoryScene(client: Client): Promise<boolean> {
  try {
    // Get the current scene data
    const sceneData = getCurrentSceneData();
    
    // Check if we need to generate a new story
    let weekendStory;
    let latestStoryPath = "";
    
    if (sceneData.currentIndex === 0 || sceneData.storyFile === "") {
      // Generate a new story for the first scene or if no story is set
      console.log("Generating new weekend story...");
      const scriptOutput = await generateNewWeekendStory();
      console.log("Script output received, length:", scriptOutput.length);
      
      // Get the latest story file
      latestStoryPath = getLatestWeekendStoryFile();
      console.log("Reading newly generated weekend story file from:", latestStoryPath);
      
      // Read the weekend story file
      weekendStory = JSON.parse(fs.readFileSync(latestStoryPath, "utf8"));
      
      // Initialize webhooks (only needed for a new story)
      console.log("Initializing webhooks...");
      const webhookUrls = getWebhookUrls();
      cleanupWebhooks(WEEKEND_STORY_CHANNEL_ID);
      await initializeWebhooks(WEEKEND_STORY_CHANNEL_ID, webhookUrls);
      
      // Update the scene data with the new story file and total scenes
      updateSceneIndex(latestStoryPath, 0, weekendStory.scenes.length);
    } else {
      // Use the existing story
      latestStoryPath = sceneData.storyFile;
      console.log(`Continuing existing story from ${latestStoryPath}, scene ${sceneData.currentIndex + 1}/${sceneData.totalScenes}`);
      
      if (!fs.existsSync(latestStoryPath)) {
        console.error("Story file no longer exists, generating a new one");
        resetSceneIndex();
        return postNextWeekendStoryScene(client); // Start over with a new story
      }
      
      // Read the existing story file
      weekendStory = JSON.parse(fs.readFileSync(latestStoryPath, "utf8"));
    }

    // Get the channel for sending event messages
    const channel = (await client.channels.fetch(
      WEEKEND_STORY_CHANNEL_ID
    )) as TextChannel;
    if (!channel) {
      throw new Error("Weekend story channel not found");
    }
    
    // Get the current scene index
    const currentIndex = sceneData.currentIndex;
    
    // Check if we've reached the end of the story
    if (currentIndex >= weekendStory.scenes.length) {
      console.log("Reached the end of the story, resetting for next time");
      
      // Send outro message
      const now = new Date();
      await sendEventMessage(
        channel,
        "weekendstory",
        false,
        now.getUTCHours(),
        now.getUTCMinutes()
      );
      
      // Reset the scene index for the next story
      resetSceneIndex();
      return true;
    }
    
    // If this is the first scene, send the intro message
    if (currentIndex === 0) {
      const now = new Date();
      await sendEventMessage(
        channel,
        "weekendstory",
        true,
        now.getUTCHours(),
        now.getUTCMinutes()
      );
    }
    
    // Get the current scene
    const scene = weekendStory.scenes[currentIndex];
    
    try {
      console.log(`Processing scene ${currentIndex + 1}/${weekendStory.scenes.length}`);
      
      // Get current time from locationTime.js
      const now = new Date();
      const { location, formattedTime, ampm } = await getLocationAndTime(now.getUTCHours(), now.getUTCMinutes());
      
      // Post the scene intro with current time instead of GPT-generated time
      const sceneIntro = `**It's ${formattedTime}${ampm} in ${location} and ${scene.intro.behavior}.**`;
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
        }
      }
      
      // Update the scene index for the next time
      updateSceneIndex(latestStoryPath, currentIndex + 1, weekendStory.scenes.length);
      
      console.log(`Scene ${currentIndex + 1}/${weekendStory.scenes.length} posted successfully`);
      return true;
    } catch (sceneError) {
      console.error(`Error posting scene ${currentIndex + 1}:`, sceneError);
      return false;
    }
  } catch (error) {
    console.error("Error in postNextWeekendStoryScene:", error);
    throw error;
  }
}

// Export for use in other files
export async function triggerWeekendStory(
  channelId: string,
  client: Client
): Promise<void> {
  console.log("Triggering weekend story scene...");
  const result = await postNextWeekendStoryScene(client);
  console.log("Weekend story scene posting completed with result:", result);
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  // Note: This won't work as a standalone script anymore since it needs a client
  console.error(
    "This module cannot be run directly as it requires a Discord client"
  );
  process.exit(1);
} 