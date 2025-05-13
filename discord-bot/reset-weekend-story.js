// Simple script to reset the weekend story index
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the weekend stories directory
const storiesDir = path.join(__dirname, "data", "weekend-stories");

// Path to the scene index file
const sceneIndexFile = path.join(__dirname, "data", "weekend-stories", "current-scene-index.json");

console.log("Resetting weekend story configuration...");

// Function to find the latest weekend story file (if any exists)
function getLatestWeekendStoryFile() {
  try {
    const files = fs
      .readdirSync(storiesDir)
      .filter(file => file.startsWith("weekend-story-") && file.endsWith(".json"))
      .map(file => ({
        name: file,
        path: path.join(storiesDir, file),
        timestamp: fs.statSync(path.join(storiesDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
    
    if (files.length === 0) {
      return null;
    }
    return files[0].path;
  } catch (error) {
    console.error("Error finding latest weekend story file:", error);
    return null;
  }
}

// Reset the scene index to trigger a new story generation
try {
  // Find the latest story file if it exists
  const latestStoryFile = getLatestWeekendStoryFile();
  
  // Create a new scene index with reset index (0)
  const data = {
    // If a story file exists, reference it, otherwise leave empty
    storyFile: latestStoryFile || "",
    currentIndex: 0,
    totalScenes: 24,
    lastUpdated: new Date().toISOString()
  };
  
  // Ensure the directory exists
  if (!fs.existsSync(path.dirname(sceneIndexFile))) {
    fs.mkdirSync(path.dirname(sceneIndexFile), { recursive: true });
  }
  
  // Write the updated scene index
  fs.writeFileSync(sceneIndexFile, JSON.stringify(data, null, 2), "utf8");
  console.log("Weekend story reset complete");
  console.log("Scene index reset to 0");
  if (latestStoryFile) {
    console.log("Using existing story file:", latestStoryFile);
  } else {
    console.log("No existing story file found - a new one will be generated");
  }
} catch (error) {
  console.error("Error resetting weekend story:", error);
} 