// Script to fix the weekend story by updating current-scene-index.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the weekend stories directory
const storiesDir = path.join(__dirname, "data", "weekend-stories");

// Path to the scene index file
const sceneIndexFile = path.join(__dirname, "data", "weekend-stories", "current-scene-index.json");

console.log("Fixing weekend story index...");

// Function to find the latest weekend story file
function getLatestWeekendStoryFile() {
  const files = fs
    .readdirSync(storiesDir)
    .filter(file => file.startsWith("weekend-story-") && file.endsWith(".json"))
    .map(file => ({
      name: file,
      path: path.join(storiesDir, file),
      timestamp: fs.statSync(path.join(storiesDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
  
  if (files.length === 0) {
    throw new Error("No weekend story files found");
  }
  
  return files[0];
}

try {
  // Find the latest weekend story file
  const latestStory = getLatestWeekendStoryFile();
  console.log(`Found latest weekend story: ${latestStory.name}`);
  
  // Update the scene index
  const sceneIndexData = {
    storyFile: latestStory.name,
    currentIndex: 0,
    totalScenes: 24,
    lastUpdated: new Date().toISOString()
  };
  
  // Read the story file to ensure it exists and has valid content
  const storyContent = JSON.parse(fs.readFileSync(latestStory.path, 'utf8'));
  console.log(`Story content validated. Found ${storyContent.scenes?.length || 0} scenes.`);
  
  // Update the scene index file
  fs.writeFileSync(sceneIndexFile, JSON.stringify(sceneIndexData, null, 2), 'utf8');
  console.log(`Scene index updated to point to "${latestStory.name}". Start the bot to use this story.`);
} catch (error) {
  console.error("Error fixing weekend story:", error);
  process.exit(1);
} 