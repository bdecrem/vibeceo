import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeWebhooks, sendAsCharacter, cleanupWebhooks, } from "./webhooks.js";
import { getWebhookUrls } from "./config.js";
import { sendEventMessage } from "./eventMessages.js";
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

// File to track the current scene index
const sceneIndexFile = path.join(process.cwd(), "data", "weekend-stories", "current-scene-index.json");

// Function to initialize or reset the scene index
function resetSceneIndex() {
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
export async function resetWeekendStory() {
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

// Function to find the latest weekend story file
function getLatestWeekendStoryFile() {
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
async function generateNewWeekendStory() {
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
function mapCoachName(name) {
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

// Get current scene index and story information
function getCurrentSceneInfo() {
    if (!fs.existsSync(sceneIndexFile)) {
        return { currentIndex: 0, storyFile: "", totalScenes: 24 };
    }
    try {
        const data = JSON.parse(fs.readFileSync(sceneIndexFile, "utf8"));
        return {
            currentIndex: data.currentIndex || 0,
            storyFile: data.storyFile || "",
            totalScenes: data.totalScenes || 24
        };
    } catch (error) {
        console.error("Error reading scene index file:", error);
        return { currentIndex: 0, storyFile: "", totalScenes: 24 };
    }
}

// Update the scene index file
function updateSceneIndex(storyFile, currentIndex, totalScenes) {
    const data = {
        storyFile,
        currentIndex,
        totalScenes,
        lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(sceneIndexFile, JSON.stringify(data, null, 2), "utf8");
    console.log(`Scene index updated to ${currentIndex}/${totalScenes}`);
}

async function postWeekendStoryToDiscord(client) {
    try {
        // Get current scene info
        const { currentIndex, storyFile, totalScenes } = getCurrentSceneInfo();
        
        // Check if we need to generate a new story
        let weekendStory;
        let latestStoryPath;
        
        if (!storyFile || currentIndex >= totalScenes) {
            // Generate a new story if no story file or we've reached the end
            console.log("Generating new weekend story...");
            await generateNewWeekendStory();
            
            // Get the latest story file
            latestStoryPath = getLatestWeekendStoryFile();
            console.log("Reading newly generated weekend story file from:", latestStoryPath);
            
            // Read the weekend story file
            weekendStory = JSON.parse(fs.readFileSync(latestStoryPath, "utf8"));
            
            // Update the scene index to start with scene 1
            updateSceneIndex(latestStoryPath, 0, weekendStory.scenes.length);
        } else {
            // Continue with existing story
            console.log(`Continuing existing story from ${storyFile}, scene ${currentIndex + 1}/${totalScenes}`);
            latestStoryPath = storyFile;
            weekendStory = JSON.parse(fs.readFileSync(storyFile, "utf8"));
        }
        
        // Initialize webhooks
        console.log("Initializing webhooks...");
        const webhookUrls = getWebhookUrls();
        cleanupWebhooks(WEEKEND_STORY_CHANNEL_ID);
        await initializeWebhooks(WEEKEND_STORY_CHANNEL_ID, webhookUrls);
        
        // Get the channel for sending event messages
        const channel = (await client.channels.fetch(WEEKEND_STORY_CHANNEL_ID));
        if (!channel) {
            throw new Error("Weekend story channel not found");
        }
        
        // Process the next scene
        const nextSceneIndex = currentIndex;
        
        if (nextSceneIndex < weekendStory.scenes.length) {
            const scene = weekendStory.scenes[nextSceneIndex];
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
                    await sendAsCharacter(WEEKEND_STORY_CHANNEL_ID, coachName, message.content);
                    // Add a short delay between messages to avoid rate limits
                    await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay
                }
                catch (messageError) {
                    console.error(`Error sending message as ${coachName}:`, messageError);
                }
            }
            
            // Update the scene index for the next time
            updateSceneIndex(latestStoryPath, nextSceneIndex + 1, weekendStory.scenes.length);
            console.log(`Scene ${nextSceneIndex + 1}/${weekendStory.scenes.length} posted successfully`);
            return true;
        } else {
            console.log("No more scenes to post, will generate new story on next call");
            return true;
        }
    }
    catch (error) {
        console.error("Error in postWeekendStoryToDiscord:", error);
        throw error;
    }
}

// Export for use in other files
export async function triggerWeekendStory(channelId, client) {
    console.log("Triggering weekend story scene...");
    const result = await postWeekendStoryToDiscord(client);
    console.log("Weekend story scene posting completed with result:", result);
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    // Note: This won't work as a standalone script anymore since it needs a client
    console.error("This module cannot be run directly as it requires a Discord client");
    process.exit(1);
}
